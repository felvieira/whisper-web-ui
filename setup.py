import os
import sys
import subprocess
import platform

def executar_comando(comando, descricao=None):
    """Executa um comando e exibe a saída."""
    if descricao:
        print(f"\n{descricao}...")
    
    try:
        processo = subprocess.run(comando, shell=True, check=True, text=True, capture_output=True)
        if processo.stdout:
            print(processo.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Erro ao executar o comando: {e}")
        if e.stdout:
            print(f"Saída: {e.stdout}")
        if e.stderr:
            print(f"Erro: {e.stderr}")
        return False

def criar_ambiente_virtual():
    """Cria um ambiente virtual Python."""
    print("\n=== Criando ambiente virtual Python ===")
    
    # Verifica se o ambiente virtual já existe
    if os.path.exists("../whisper_env"):
        print("Ambiente virtual já existe.")
        return True
    
    # Cria o ambiente virtual
    if executar_comando("cd .. && python -m venv whisper_env", "Criando ambiente virtual"):
        print("Ambiente virtual criado com sucesso.")
        return True
    else:
        print("Falha ao criar ambiente virtual.")
        return False

def instalar_dependencias():
    """Instala as dependências do projeto."""
    print("\n=== Instalando dependências ===")
    
    # Ativa o ambiente virtual e instala as dependências
    if platform.system() == "Windows":
        ativar_cmd = "..\\whisper_env\\Scripts\\activate"
    else:
        ativar_cmd = "source ../whisper_env/bin/activate"
    
    # Instala as dependências do backend
    if not executar_comando(f"cd .. && {ativar_cmd} && pip install -r whisper-web-ui/requirements.txt", 
                         "Instalando dependências do backend"):
        return False
    
    # Instala as dependências do frontend
    if not executar_comando("npm install", "Instalando dependências do frontend"):
        return False
    
    print("Todas as dependências foram instaladas com sucesso.")
    return True

def baixar_modelos():
    """Baixa os modelos do Whisper."""
    print("\n=== Baixando modelos do Whisper ===")
    
    # Ativa o ambiente virtual e executa o script de download
    if platform.system() == "Windows":
        ativar_cmd = "..\\whisper_env\\Scripts\\activate"
    else:
        ativar_cmd = "source ../whisper_env/bin/activate"
    
    if executar_comando(f"cd .. && {ativar_cmd} && python whisper-web-ui/download_models.py", 
                      "Baixando modelos do Whisper"):
        print("Modelos baixados com sucesso.")
        return True
    else:
        print("Falha ao baixar modelos.")
        return False

def main():
    """Função principal de instalação."""
    print("=== Iniciando instalação do Whisper Web UI ===")
    
    # Verifica se o Python está instalado
    if not executar_comando("python --version", "Verificando versão do Python"):
        print("Python não encontrado. Por favor, instale o Python 3.8 ou superior.")
        return
    
    # Verifica se o Node.js está instalado
    if not executar_comando("node --version", "Verificando versão do Node.js"):
        print("Node.js não encontrado. Por favor, instale o Node.js 14 ou superior.")
        return
    
    # Verifica se o npm está instalado
    if not executar_comando("npm --version", "Verificando versão do npm"):
        print("npm não encontrado. Por favor, instale o npm.")
        return
    
    # Cria o ambiente virtual
    if not criar_ambiente_virtual():
        return
    
    # Instala as dependências
    if not instalar_dependencias():
        return
    
    # Baixa os modelos
    if not baixar_modelos():
        return
    
    print("\n=== Instalação concluída com sucesso! ===")
    print("\nPara iniciar o servidor backend:")
    if platform.system() == "Windows":
        print("cd .. && .\\whisper_env\\Scripts\\activate && cd whisper-web-ui && python backend.py")
    else:
        print("cd .. && source whisper_env/bin/activate && cd whisper-web-ui && python backend.py")
    
    print("\nPara iniciar o servidor frontend:")
    print("cd whisper-web-ui && npm run dev")

if __name__ == "__main__":
    main() 