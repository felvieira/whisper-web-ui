import axios from 'axios';

// URL base da API - ajuste conforme necessário
const API_URL = 'http://localhost:5000';

// Interface para os parâmetros de transcrição
export interface TranscricaoParams {
  arquivo: File;
  modelo: string;
  formato: string;
  dispositivo: string;
  idioma: string;
  tarefa: string;
}

// Interface para o status da tarefa
export interface StatusTarefa {
  id: string;
  nome_arquivo: string;
  modelo: string;
  formato: string;
  dispositivo: string;
  idioma: string;
  tarefa: string;
  status: 'enfileirado' | 'processando' | 'transcrevendo' | 'concluido' | 'erro';
  data_criacao: string;
  progresso: number;
  erro?: string;
  tempo_processamento?: number;
  arquivo_saida?: string;
  nome_arquivo_saida?: string;
}

// Função para enviar o arquivo de áudio para transcrição
export async function enviarParaTranscricao(params: TranscricaoParams): Promise<{ id: string }> {
  const formData = new FormData();
  formData.append('arquivo', params.arquivo);
  formData.append('modelo', params.modelo);
  formData.append('formato', params.formato);
  formData.append('dispositivo', params.dispositivo);
  formData.append('idioma', params.idioma);
  formData.append('tarefa', params.tarefa);

  try {
    const response = await axios.post(`${API_URL}/transcrever`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return { id: response.data.id };
  } catch (error) {
    console.error('Erro ao enviar áudio para transcrição:', error);
    throw error;
  }
}

// Função para verificar o status de uma tarefa
export async function verificarStatusTarefa(id: string): Promise<StatusTarefa> {
  try {
    const response = await axios.get(`${API_URL}/status/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Erro ao verificar status da tarefa ${id}:`, error);
    throw error;
  }
}

// Função para baixar o resultado de uma tarefa
export async function baixarResultadoTarefa(id: string): Promise<void> {
  try {
    const response = await axios.get(`${API_URL}/download/${id}`, {
      responseType: 'blob',
    });

    // Determina o tipo MIME e extensão do arquivo com base no formato
    const contentDisposition = response.headers['content-disposition'];
    const nomeArquivo = contentDisposition
      ? contentDisposition.split('filename=')[1].replace(/"/g, '')
      : `resultado_${id}.txt`;

    // Determina o tipo MIME com base na extensão
    let mimeType = 'text/plain';
    const extensao = nomeArquivo.split('.').pop()?.toLowerCase();
    
    switch (extensao) {
      case 'srt':
        mimeType = 'application/x-subrip';
        break;
      case 'vtt':
        mimeType = 'text/vtt';
        break;
      case 'json':
        mimeType = 'application/json';
        break;
    }

    // Cria um objeto URL para o blob
    const url = window.URL.createObjectURL(
      new Blob([response.data], { type: mimeType })
    );

    // Cria um elemento de link para download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', nomeArquivo);
    
    // Adiciona o link ao documento, clica nele e o remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error(`Erro ao baixar resultado da tarefa ${id}:`, error);
    throw error;
  }
}

// Função para listar todas as tarefas
export async function listarTarefas(): Promise<StatusTarefa[]> {
  try {
    const response = await axios.get(`${API_URL}/tarefas`);
    return response.data;
  } catch (error) {
    console.error('Erro ao listar tarefas:', error);
    throw error;
  }
}

// Função para reenviar uma tarefa que falhou
export async function reenviarTarefa(id: string, arquivo?: File): Promise<{ id: string }> {
  try {
    const formData = new FormData();
    
    // Se um novo arquivo foi fornecido, adiciona-o ao FormData
    if (arquivo) {
      formData.append('arquivo', arquivo);
    }
    
    const response = await axios.post(`${API_URL}/reenviar/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return { id: response.data.id };
  } catch (error) {
    console.error(`Erro ao reenviar tarefa ${id}:`, error);
    
    // Verifica se o erro indica que precisamos do arquivo original
    if (axios.isAxiosError(error) && error.response?.data?.precisa_arquivo) {
      throw new Error('Arquivo original não disponível. Por favor, envie o arquivo novamente.');
    }
    
    throw error;
  }
} 