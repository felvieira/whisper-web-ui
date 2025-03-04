# Backend do Whisper Web UI

Este é o backend para a interface web do Whisper, responsável por processar arquivos de áudio e gerar transcrições usando o modelo Whisper da OpenAI.

## Requisitos

- Python 3.8 ou superior
- FFmpeg instalado no sistema
- GPU NVIDIA com CUDA (opcional, para processamento mais rápido)

## Instalação

1. Crie um ambiente virtual Python:

```bash
python -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate
```

2. Instale as dependências:

```bash
pip install -r requirements.txt
```

## Uso

1. Inicie o servidor:

```bash
python backend.py
```

2. O servidor estará disponível em http://localhost:5000

## API

### Endpoint: `/transcrever`

**Método**: POST

**Parâmetros**:

- `arquivo`: O arquivo de áudio a ser transcrito (multipart/form-data)
- `modelo`: O modelo Whisper a ser utilizado (tiny, base, small, medium, large, turbo)
- `formato`: O formato de saída desejado (txt, srt, vtt, json)
- `dispositivo`: O dispositivo a ser utilizado para processamento (cpu, cuda)
- `idioma`: O idioma do áudio (auto para detecção automática, ou código de idioma específico)
- `tarefa`: A tarefa a ser realizada (transcribe, translate)

**Resposta**:

- Arquivo de transcrição no formato solicitado

## Notas

- Os modelos são carregados sob demanda e mantidos em memória para uso futuro
- O processamento em GPU (CUDA) é utilizado automaticamente se disponível e solicitado
- Os arquivos temporários são limpos após o processamento 