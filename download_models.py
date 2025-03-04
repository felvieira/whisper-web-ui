import os
import whisper
import torch

def download_models():
    """
    Baixa todos os modelos do Whisper para o cache local.
    """
    print("Verificando disponibilidade de CUDA...")
    cuda_disponivel = torch.cuda.is_available()
    if cuda_disponivel:
        print(f"CUDA disponível: {torch.cuda.get_device_name(0)}")
    else:
        print("CUDA não disponível. Usando CPU.")
    
    # Lista de todos os modelos disponíveis
    modelos = ["tiny", "base", "small", "medium", "large", "large-v3"]
    
    # Diretório de cache
    cache_dir = os.path.expanduser("~/.cache/whisper")
    os.makedirs(cache_dir, exist_ok=True)
    
    print(f"Diretório de cache: {cache_dir}")
    print("Iniciando download dos modelos...")
    
    # Verifica quais modelos já estão baixados
    modelos_existentes = [f.replace(".pt", "") for f in os.listdir(cache_dir) if f.endswith(".pt")]
    print(f"Modelos já baixados: {', '.join(modelos_existentes) if modelos_existentes else 'Nenhum'}")
    
    # Baixa os modelos que ainda não foram baixados
    for modelo in modelos:
        if modelo in modelos_existentes:
            print(f"Modelo {modelo} já está baixado.")
            continue
        
        print(f"Baixando modelo {modelo}...")
        try:
            # Carrega o modelo (isso fará o download automaticamente)
            whisper.load_model(modelo)
            print(f"Modelo {modelo} baixado com sucesso!")
        except Exception as e:
            print(f"Erro ao baixar modelo {modelo}: {str(e)}")
    
    print("\nTodos os modelos foram verificados/baixados.")
    print("Modelos disponíveis:")
    for modelo in os.listdir(cache_dir):
        if modelo.endswith(".pt"):
            tamanho = os.path.getsize(os.path.join(cache_dir, modelo)) / (1024 * 1024)  # Tamanho em MB
            print(f"- {modelo}: {tamanho:.1f} MB")

if __name__ == "__main__":
    download_models() 