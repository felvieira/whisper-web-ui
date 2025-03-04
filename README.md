# Whisper Web UI

Interface web para transcrição de áudio usando o modelo Whisper da OpenAI.

![Whisper Web UI](https://github.com/openai/whisper/raw/main/approach.png)

## Sobre o Projeto

Este projeto fornece uma interface web amigável para o [Whisper](https://github.com/openai/whisper), um modelo de reconhecimento automático de fala (ASR) desenvolvido pela OpenAI. Com esta interface, você pode:

- Fazer upload de arquivos de áudio para transcrição
- Escolher entre diferentes modelos do Whisper (tiny, base, small, medium, large)
- Selecionar o formato de saída (texto, SRT, VTT, JSON)
- Usar CPU ou GPU (CUDA) para processamento
- Acompanhar o progresso das transcrições
- Baixar os resultados

## Requisitos

- Python 3.8 ou superior
- Node.js 14 ou superior
- npm
- FFmpeg (para processamento de áudio)
- GPU NVIDIA com CUDA (opcional, para processamento mais rápido)

## Instalação

### Instalação Automática

Para facilitar a instalação, use o script de configuração:

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/whisper-web-ui.git
cd whisper-web-ui

# Execute o script de instalação
python setup.py
```

### Instalação Manual

Se preferir instalar manualmente:

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/whisper-web-ui.git
   cd whisper-web-ui
   ```

2. Crie e ative um ambiente virtual Python:
   ```bash
   # No diretório pai
   cd ..
   python -m venv whisper_env
   
   # Windows
   whisper_env\Scripts\activate
   
   # Linux/Mac
   source whisper_env/bin/activate
   
   # Volte para o diretório do projeto
   cd whisper-web-ui
   ```

3. Instale as dependências do backend:
   ```bash
   pip install -r requirements.txt
   ```

4. Instale as dependências do frontend:
   ```bash
   npm install
   ```

5. Baixe os modelos do Whisper:
   ```bash
   python download_models.py
   ```

## Uso

### Iniciar o Backend

```bash
# Ative o ambiente virtual (se ainda não estiver ativado)
# Windows
..\whisper_env\Scripts\activate

# Linux/Mac
source ../whisper_env/bin/activate

# Inicie o servidor backend
python backend.py
```

O servidor backend estará disponível em `http://localhost:5000`.

### Iniciar o Frontend

Em outro terminal:

```bash
npm run dev
```

O frontend estará disponível em `http://localhost:3000`.

## Funcionalidades

### Transcrição de Áudio

1. Acesse a interface web em `http://localhost:3000`
2. Faça upload de um arquivo de áudio
3. Selecione as opções desejadas:
   - **Modelo**: Escolha entre tiny (mais rápido, menos preciso) até large (mais lento, mais preciso)
   - **Formato de Saída**: TXT, SRT, VTT ou JSON
   - **Dispositivo**: CPU ou CUDA (GPU)
   - **Idioma**: Detecção automática ou selecione um idioma específico
   - **Tarefa**: Transcrição (manter idioma original) ou Tradução (para inglês)
4. Clique em "Transcrever Áudio"
5. Acompanhe o progresso na aba "Tarefas"
6. Baixe o resultado quando a transcrição estiver concluída

### Gerenciamento de Tarefas

- **Lista de Tarefas**: Visualize todas as tarefas de transcrição
- **Status**: Acompanhe o progresso de cada tarefa
- **Download**: Baixe os resultados das transcrições concluídas
- **Tentar Novamente**: Reenvie tarefas que falharam

## Modelos Disponíveis

| Modelo | Parâmetros | Tamanho | Requisitos de RAM | Tempo Relativo | Precisão |
|--------|------------|---------|-------------------|----------------|----------|
| tiny   | 39 M       | 75 MB   | ~1 GB             | ~32x           | Baixa    |
| base   | 74 M       | 142 MB  | ~1 GB             | ~16x           | Média    |
| small  | 244 M      | 466 MB  | ~2 GB             | ~6x            | Boa      |
| medium | 769 M      | 1.5 GB  | ~5 GB             | ~2x            | Muito boa|
| large  | 1550 M     | 3.0 GB  | ~10 GB            | 1x             | Excelente|

## Solução de Problemas

### Erro "No module named 'tiktoken'"

Instale a biblioteca tiktoken:

```bash
pip install tiktoken
```

### Erro ao carregar modelos grandes

Os modelos maiores (medium, large) requerem mais RAM. Certifique-se de que seu sistema tem memória suficiente.

### Problemas com CUDA

Verifique se o CUDA está instalado corretamente:

```bash
python -c "import torch; print(torch.cuda.is_available())"
```

Se retornar `False`, verifique a instalação do CUDA e dos drivers da NVIDIA.

## Licença

Este projeto é licenciado sob a licença MIT - veja o arquivo LICENSE para detalhes.

## Agradecimentos

- [OpenAI Whisper](https://github.com/openai/whisper) pelo modelo de reconhecimento de fala
- [Next.js](https://nextjs.org/) pelo framework frontend
- [Flask](https://flask.palletsprojects.com/) pelo framework backend
