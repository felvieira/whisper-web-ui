import os
import time
import tempfile
import whisper
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import torch
import uuid
import threading
import queue
from datetime import datetime
import json

# Função para escrever arquivos SRT
def write_srt(segments, file):
    """Escreve os segmentos no formato SRT."""
    for i, segment in enumerate(segments, start=1):
        # Converte os tempos de início e fim para o formato SRT (HH:MM:SS,mmm)
        start_time = format_timestamp(segment["start"])
        end_time = format_timestamp(segment["end"])
        
        # Escreve o número do segmento
        print(f"{i}", file=file)
        
        # Escreve o intervalo de tempo
        print(f"{start_time} --> {end_time}", file=file)
        
        # Escreve o texto
        print(f"{segment['text'].strip()}\n", file=file)

def format_timestamp(seconds):
    """Formata um tempo em segundos para o formato SRT (HH:MM:SS,mmm)."""
    hours = int(seconds / 3600)
    minutes = int((seconds % 3600) / 60)
    seconds = seconds % 60
    milliseconds = int((seconds - int(seconds)) * 1000)
    
    return f"{hours:02d}:{minutes:02d}:{int(seconds):02d},{milliseconds:03d}"

# Função para escrever arquivos VTT
def write_vtt(segments, file):
    """Escreve os segmentos no formato VTT."""
    print("WEBVTT\n", file=file)
    
    for segment in segments:
        # Converte os tempos de início e fim para o formato VTT (HH:MM:SS.mmm)
        start_time = format_timestamp_vtt(segment["start"])
        end_time = format_timestamp_vtt(segment["end"])
        
        # Escreve o intervalo de tempo
        print(f"{start_time} --> {end_time}", file=file)
        
        # Escreve o texto
        print(f"{segment['text'].strip()}\n", file=file)

def format_timestamp_vtt(seconds):
    """Formata um tempo em segundos para o formato VTT (HH:MM:SS.mmm)."""
    hours = int(seconds / 3600)
    minutes = int((seconds % 3600) / 60)
    seconds = seconds % 60
    milliseconds = int((seconds - int(seconds)) * 1000)
    
    return f"{hours:02d}:{minutes:02d}:{int(seconds):02d}.{milliseconds:03d}"

app = Flask(__name__)
CORS(app)  # Habilita CORS para todas as rotas

# Caminho para o arquivo de armazenamento de tarefas
TAREFAS_ARQUIVO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tarefas.json')

# Dicionário para armazenar os modelos carregados
modelos_carregados = {}

# Fila de tarefas
tarefas_fila = queue.Queue()

# Dicionário para armazenar o status das tarefas
tarefas_status = {}

# Função para carregar tarefas do arquivo
def carregar_tarefas():
    global tarefas_status
    try:
        if os.path.exists(TAREFAS_ARQUIVO):
            with open(TAREFAS_ARQUIVO, 'r', encoding='utf-8') as f:
                tarefas_status = json.load(f)
                print(f"Carregadas {len(tarefas_status)} tarefas do arquivo.")
        else:
            print("Arquivo de tarefas não encontrado. Iniciando com lista vazia.")
            tarefas_status = {}
    except Exception as e:
        print(f"Erro ao carregar tarefas: {str(e)}")
        tarefas_status = {}

# Função para salvar tarefas no arquivo
def salvar_tarefas():
    try:
        with open(TAREFAS_ARQUIVO, 'w', encoding='utf-8') as f:
            json.dump(tarefas_status, f, ensure_ascii=False, indent=2)
        print(f"Salvas {len(tarefas_status)} tarefas no arquivo.")
    except Exception as e:
        print(f"Erro ao salvar tarefas: {str(e)}")

# Carrega as tarefas ao iniciar
carregar_tarefas()

def carregar_modelo(nome_modelo):
    """Carrega um modelo Whisper se ainda não estiver carregado."""
    if nome_modelo not in modelos_carregados:
        print(f"Carregando modelo {nome_modelo}...")
        # Atualiza o status de todas as tarefas que estão esperando por este modelo
        for tarefa_id, tarefa in tarefas_status.items():
            if tarefa["status"] == "processando" and tarefa["modelo"] == nome_modelo:
                tarefa["status"] = "carregando_modelo"
                tarefa["progresso"] = 10
                print(f"Atualizando status da tarefa {tarefa_id} para 'carregando_modelo'")
        
        # Salva o status atualizado
        salvar_tarefas()
        
        # Verifica se CUDA está disponível
        device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Carrega o modelo
        inicio_carregamento = time.time()
        modelos_carregados[nome_modelo] = whisper.load_model(nome_modelo).to(device)
        tempo_carregamento = time.time() - inicio_carregamento
        
        print(f"Modelo {nome_modelo} carregado em {tempo_carregamento:.2f} segundos")
        
        # Atualiza novamente o status das tarefas
        for tarefa_id, tarefa in tarefas_status.items():
            if tarefa["status"] == "carregando_modelo" and tarefa["modelo"] == nome_modelo:
                tarefa["status"] = "transcrevendo"
                tarefa["progresso"] = 30
                print(f"Atualizando status da tarefa {tarefa_id} para 'transcrevendo'")
        
        # Salva o status atualizado
        salvar_tarefas()
    
    return modelos_carregados[nome_modelo]

# Thread worker para processar tarefas em segundo plano
def worker_thread():
    while True:
        try:
            # Obtém uma tarefa da fila
            tarefa = tarefas_fila.get()
            if tarefa is None:
                break
                
            # Atualiza o status da tarefa
            tarefa_id = tarefa["id"]
            tarefas_status[tarefa_id]["status"] = "processando"
            tarefas_status[tarefa_id]["progresso"] = 5
            salvar_tarefas()  # Salva o status atualizado
            
            # Processa a tarefa
            try:
                # Carrega o modelo
                modelo_nome = tarefa["modelo"]
                print(f"Carregando modelo {modelo_nome}...")
                modelo_whisper = carregar_modelo(modelo_nome)
                
                # Define o dispositivo para o modelo
                torch_device = tarefa["dispositivo"]
                if torch_device == "cuda":
                    modelo_whisper.to(torch_device)
                
                # Configura as opções de transcrição
                opcoes = {
                    "task": "translate" if tarefa["tarefa"] == "traducao" else "transcribe",
                    "fp16": torch.cuda.is_available() and torch_device == "cuda"
                }
                
                # Adiciona o idioma se não for auto
                if tarefa["idioma"] != 'auto':
                    opcoes["language"] = tarefa["idioma"]
                
                print(f"Iniciando transcrição com opções: {opcoes}")
                
                # Atualiza o status
                tarefas_status[tarefa_id]["status"] = "transcrevendo"
                tarefas_status[tarefa_id]["progresso"] = 40
                salvar_tarefas()  # Salva o status atualizado
                
                # Realiza a transcrição
                tempo_inicio_transcricao = time.time()
                resultado = modelo_whisper.transcribe(tarefa["arquivo_temp"], **opcoes)
                tempo_transcricao = time.time() - tempo_inicio_transcricao
                print(f"Transcrição concluída em {tempo_transcricao:.2f} segundos")
                
                # Atualiza o progresso
                tarefas_status[tarefa_id]["progresso"] = 70
                salvar_tarefas()  # Salva o status atualizado
                
                # Cria um arquivo temporário para a saída
                formato = tarefa["formato"]
                saida_temp = tempfile.NamedTemporaryFile(delete=False, suffix=f'.{formato}')
                
                # Escreve o resultado no formato solicitado
                if formato == 'txt':
                    with open(saida_temp.name, 'w', encoding='utf-8') as f:
                        f.write(resultado["text"])
                elif formato == 'srt':
                    with open(saida_temp.name, 'w', encoding='utf-8') as f:
                        write_srt(resultado["segments"], f)
                elif formato == 'vtt':
                    with open(saida_temp.name, 'w', encoding='utf-8') as f:
                        write_vtt(resultado["segments"], f)
                elif formato == 'json':
                    with open(saida_temp.name, 'w', encoding='utf-8') as f:
                        import json
                        json.dump(resultado, f, ensure_ascii=False, indent=2)
                
                # Cria um diretório para armazenar os resultados permanentemente
                resultados_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'resultados')
                os.makedirs(resultados_dir, exist_ok=True)
                
                # Cria um nome de arquivo único para o resultado
                nome_arquivo_resultado = f"{tarefa_id}_{os.path.splitext(tarefa['nome_arquivo'])[0]}.{formato}"
                caminho_resultado = os.path.join(resultados_dir, nome_arquivo_resultado)
                
                # Copia o arquivo temporário para o diretório de resultados
                with open(saida_temp.name, 'rb') as f_src:
                    with open(caminho_resultado, 'wb') as f_dst:
                        f_dst.write(f_src.read())
                
                # Atualiza o status da tarefa
                tarefas_status[tarefa_id]["status"] = "concluido"
                tarefas_status[tarefa_id]["arquivo_saida"] = caminho_resultado
                tarefas_status[tarefa_id]["nome_arquivo_saida"] = os.path.splitext(tarefa["nome_arquivo"])[0] + f'.{formato}'
                tarefas_status[tarefa_id]["tempo_processamento"] = tempo_transcricao
                tarefas_status[tarefa_id]["progresso"] = 100
                salvar_tarefas()  # Salva o status atualizado
                
            except Exception as e:
                import traceback
                print(f"Erro durante a transcrição: {str(e)}")
                print(traceback.format_exc())
                
                # Atualiza o status da tarefa com o erro
                tarefas_status[tarefa_id]["status"] = "erro"
                tarefas_status[tarefa_id]["erro"] = str(e)
                salvar_tarefas()  # Salva o status atualizado
            
            finally:
                # Limpa os arquivos temporários
                try:
                    os.remove(tarefa["arquivo_temp"])
                    os.rmdir(tarefa["temp_dir"])
                    print("Arquivos temporários removidos")
                except Exception as e:
                    print(f"Erro ao remover arquivos temporários: {str(e)}")
                
                # Marca a tarefa como concluída na fila
                tarefas_fila.task_done()
                
        except Exception as e:
            print(f"Erro no worker: {str(e)}")

# Inicia o thread worker
worker = threading.Thread(target=worker_thread, daemon=True)
worker.start()

@app.route('/', methods=['GET', 'HEAD'])
def health_check():
    """Rota para verificação de saúde do servidor."""
    return jsonify({"status": "online", "message": "Servidor Whisper está funcionando"}), 200

@app.route('/transcrever', methods=['POST'])
def transcrever():
    print("Iniciando processo de transcrição...")
    
    # Verifica se o arquivo foi enviado
    if 'arquivo' not in request.files:
        print("Erro: Nenhum arquivo enviado")
        return jsonify({"erro": "Nenhum arquivo enviado"}), 400
    
    arquivo = request.files['arquivo']
    
    # Verifica se o nome do arquivo é válido
    if arquivo.filename == '':
        print("Erro: Nome de arquivo inválido")
        return jsonify({"erro": "Nome de arquivo inválido"}), 400
    
    # Obtém os parâmetros da requisição
    modelo = request.form.get('modelo', 'tiny')
    formato = request.form.get('formato', 'txt')
    dispositivo = request.form.get('dispositivo', 'cpu')
    idioma = request.form.get('idioma', 'auto')
    tarefa = request.form.get('tarefa', 'transcribe')
    
    print(f"Parâmetros recebidos: modelo={modelo}, formato={formato}, dispositivo={dispositivo}, idioma={idioma}, tarefa={tarefa}")
    
    # Configura o dispositivo
    cuda_disponivel = torch.cuda.is_available()
    if dispositivo == 'cuda' and cuda_disponivel:
        torch_device = "cuda"
        print(f"Usando CUDA: {torch.cuda.get_device_name(0)}")
    else:
        torch_device = "cpu"
        if dispositivo == 'cuda' and not cuda_disponivel:
            print("AVISO: CUDA solicitado, mas não está disponível. Usando CPU.")
        else:
            print("Usando CPU para processamento.")
    
    # Salva o arquivo temporariamente
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, arquivo.filename)
    arquivo.save(temp_path)
    print(f"Arquivo salvo temporariamente em: {temp_path}")
    
    # Gera um ID único para a tarefa
    tarefa_id = str(uuid.uuid4())
    
    # Cria uma entrada no dicionário de status
    tarefas_status[tarefa_id] = {
        "id": tarefa_id,
        "nome_arquivo": arquivo.filename,
        "modelo": modelo,
        "formato": formato,
        "dispositivo": torch_device,
        "idioma": idioma,
        "tarefa": tarefa,
        "status": "enfileirado",
        "data_criacao": datetime.now().isoformat(),
        "progresso": 0
    }
    
    # Salva o status das tarefas
    salvar_tarefas()
    
    # Adiciona a tarefa à fila
    tarefas_fila.put({
        "id": tarefa_id,
        "arquivo_temp": temp_path,
        "temp_dir": temp_dir,
        "nome_arquivo": arquivo.filename,
        "modelo": modelo,
        "formato": formato,
        "dispositivo": torch_device,
        "idioma": idioma,
        "tarefa": tarefa
    })
    
    # Retorna o ID da tarefa
    return jsonify({
        "id": tarefa_id,
        "mensagem": "Arquivo enviado para processamento",
        "status": "enfileirado"
    })

@app.route('/status/<tarefa_id>', methods=['GET'])
def status_tarefa(tarefa_id):
    """Retorna o status de uma tarefa."""
    if tarefa_id not in tarefas_status:
        return jsonify({"erro": "Tarefa não encontrada"}), 404
    
    return jsonify(tarefas_status[tarefa_id])

@app.route('/download/<tarefa_id>', methods=['GET'])
def download_resultado(tarefa_id):
    """Permite o download do resultado de uma tarefa concluída."""
    if tarefa_id not in tarefas_status:
        return jsonify({"erro": "Tarefa não encontrada"}), 404
    
    tarefa = tarefas_status[tarefa_id]
    
    if tarefa["status"] != "concluido":
        return jsonify({"erro": "Tarefa ainda não concluída"}), 400
    
    if not os.path.exists(tarefa["arquivo_saida"]):
        return jsonify({"erro": "Arquivo de resultado não encontrado"}), 404
    
    return send_file(
        tarefa["arquivo_saida"],
        as_attachment=True,
        download_name=tarefa["nome_arquivo_saida"],
        mimetype='application/octet-stream'
    )

@app.route('/tarefas', methods=['GET'])
def listar_tarefas():
    """Lista todas as tarefas."""
    return jsonify(list(tarefas_status.values()))

@app.route('/reenviar/<tarefa_id>', methods=['POST'])
def reenviar_tarefa(tarefa_id):
    """Reenvia uma tarefa que falhou para processamento."""
    if tarefa_id not in tarefas_status:
        return jsonify({"erro": "Tarefa não encontrada"}), 404
    
    tarefa = tarefas_status[tarefa_id]
    
    # Verifica se a tarefa está em estado de erro
    if tarefa["status"] != "erro":
        return jsonify({"erro": "Apenas tarefas com erro podem ser reenviadas"}), 400
    
    # Verifica se o arquivo de áudio original ainda existe
    arquivo_original = request.files.get('arquivo')
    
    if not arquivo_original and 'arquivo_temp' not in tarefa:
        return jsonify({"erro": "Arquivo original não encontrado. Por favor, faça upload novamente."}), 400
    
    # Se um novo arquivo foi enviado, use-o
    if arquivo_original:
        # Salva o arquivo temporariamente
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, arquivo_original.filename)
        arquivo_original.save(temp_path)
        print(f"Novo arquivo salvo temporariamente em: {temp_path}")
        
        # Atualiza o nome do arquivo se necessário
        tarefa["nome_arquivo"] = arquivo_original.filename
    else:
        # Usa as informações da tarefa original
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, tarefa["nome_arquivo"])
        
        # Aqui precisaríamos ter o arquivo original, mas como não temos,
        # retornamos um erro informando que é necessário enviar o arquivo novamente
        return jsonify({
            "erro": "Arquivo original não disponível. Por favor, envie o arquivo novamente.",
            "precisa_arquivo": True
        }), 400
    
    # Atualiza o status da tarefa
    tarefa["status"] = "enfileirado"
    tarefa["data_criacao"] = datetime.now().isoformat()
    tarefa["progresso"] = 0
    tarefa["erro"] = None
    
    # Salva o status atualizado
    salvar_tarefas()
    
    # Adiciona a tarefa à fila
    tarefas_fila.put({
        "id": tarefa_id,
        "arquivo_temp": temp_path,
        "temp_dir": temp_dir,
        "nome_arquivo": tarefa["nome_arquivo"],
        "modelo": tarefa["modelo"],
        "formato": tarefa["formato"],
        "dispositivo": tarefa["dispositivo"],
        "idioma": tarefa["idioma"],
        "tarefa": tarefa["tarefa"]
    })
    
    # Retorna o status atualizado
    return jsonify({
        "id": tarefa_id,
        "mensagem": "Tarefa reenviada para processamento",
        "status": "enfileirado"
    })

if __name__ == '__main__':
    print(f"CUDA disponível: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"Dispositivo CUDA: {torch.cuda.get_device_name(0)}")
    app.run(host='0.0.0.0', port=5000, debug=True) 