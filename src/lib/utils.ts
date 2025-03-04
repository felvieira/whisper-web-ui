import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { StatusTarefa } from "./api"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Chave para armazenar as tarefas no localStorage
const TAREFAS_STORAGE_KEY = 'whisper_tarefas'

// Função para salvar tarefas no localStorage
export function salvarTarefasLocal(tarefas: StatusTarefa[]): void {
  try {
    localStorage.setItem(TAREFAS_STORAGE_KEY, JSON.stringify(tarefas))
  } catch (error) {
    console.error('Erro ao salvar tarefas no localStorage:', error)
  }
}

// Função para carregar tarefas do localStorage
export function carregarTarefasLocal(): StatusTarefa[] {
  try {
    const tarefasString = localStorage.getItem(TAREFAS_STORAGE_KEY)
    if (!tarefasString) return []
    
    return JSON.parse(tarefasString)
  } catch (error) {
    console.error('Erro ao carregar tarefas do localStorage:', error)
    return []
  }
}

// Função para adicionar uma tarefa ao localStorage
export function adicionarTarefaLocal(tarefa: StatusTarefa): void {
  try {
    const tarefas = carregarTarefasLocal()
    const index = tarefas.findIndex(t => t.id === tarefa.id)
    
    if (index !== -1) {
      // Atualiza a tarefa existente
      tarefas[index] = tarefa
    } else {
      // Adiciona a nova tarefa
      tarefas.push(tarefa)
    }
    
    salvarTarefasLocal(tarefas)
  } catch (error) {
    console.error('Erro ao adicionar tarefa ao localStorage:', error)
  }
}

// Função para formatar o tamanho do arquivo
export function formatarTamanhoArquivo(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// Função para formatar a data
export function formatarData(dataIso: string): string {
  try {
    return new Date(dataIso).toLocaleString()
  } catch {
    // Ignora o erro e retorna a string original
    return dataIso
  }
}
