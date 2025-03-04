"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { enviarParaTranscricao, verificarStatusTarefa, baixarResultadoTarefa, listarTarefas, StatusTarefa, reenviarTarefa } from "@/lib/api";
import { toast } from "sonner";
import { carregarTarefasLocal, salvarTarefasLocal, formatarTamanhoArquivo, formatarData } from "@/lib/utils";
import React from "react";

// Componentes Tabs do Radix UI com estilos
const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm ${className}`}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export default function WhisperInterface() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [modelo, setModelo] = useState<string>("tiny");
  const [formato, setFormato] = useState<string>("txt");
  const [dispositivo, setDispositivo] = useState<string>("cpu");
  const [idioma, setIdioma] = useState<string>("auto");
  const [tarefa, setTarefa] = useState<string>("transcricao");
  const [statusProcessamento, setStatusProcessamento] = useState<"ocioso" | "enviando" | "processando" | "concluido">("ocioso");
  const [statusBackend, setStatusBackend] = useState<"verificando" | "online" | "offline">("verificando");
  const [tempoEstimado, setTempoEstimado] = useState<number | null>(null);
  const [tarefaAtual, setTarefaAtual] = useState<string | null>(null);
  const [tarefas, setTarefas] = useState<StatusTarefa[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<string>("nova");
  const [tarefaReenvio, setTarefaReenvio] = useState<StatusTarefa | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [processandoTarefa, setProcessandoTarefa] = useState<boolean>(false);

  // Verifica o status do backend ao carregar o componente
  useEffect(() => {
    const verificarBackend = async () => {
      try {
        // Tenta fazer uma requisição simples para o backend
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch("http://localhost:5000/", { 
          method: "HEAD",
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          setStatusBackend("online");
          console.log("Backend está online");
          
          // Carrega a lista de tarefas
          carregarTarefas();
        } else {
          setStatusBackend("offline");
          console.error("Backend respondeu com status:", response.status);
          toast.error("Servidor backend não está respondendo corretamente.");
        }
      } catch (error) {
        console.error("Erro ao verificar backend:", error);
        setStatusBackend("offline");
        toast.error("Não foi possível conectar ao servidor backend. Verifique se ele está rodando.");
      }
    };

    verificarBackend();
  }, []);

  // Carrega a lista de tarefas
  const carregarTarefas = async () => {
    try {
      // Primeiro tenta carregar do backend
      const tarefasData = await listarTarefas();
      setTarefas(tarefasData);
      
      // Salva no localStorage para acesso offline
      salvarTarefasLocal(tarefasData);
    } catch (error) {
      console.error("Erro ao carregar tarefas do servidor:", error);
      toast.error("Erro ao carregar a lista de tarefas do servidor. Usando dados locais.");
      
      // Se falhar, carrega do localStorage
      const tarefasLocais = carregarTarefasLocal();
      setTarefas(tarefasLocais);
    }
  };

  // Carrega as tarefas do localStorage ao iniciar
  useEffect(() => {
    const tarefasLocais = carregarTarefasLocal();
    if (tarefasLocais.length > 0) {
      setTarefas(tarefasLocais);
    }
  }, []);

  // Atualiza o status da tarefa atual
  useEffect(() => {
    if (!tarefaAtual || statusBackend !== "online") return;

    const intervalId = setInterval(async () => {
      try {
        const status = await verificarStatusTarefa(tarefaAtual);
        
        // Atualiza a lista de tarefas
        setTarefas(tarefas => {
          const tarefasAtualizadas = [...tarefas];
          const index = tarefasAtualizadas.findIndex(t => t.id === tarefaAtual);
          
          if (index !== -1) {
            tarefasAtualizadas[index] = status;
          } else {
            tarefasAtualizadas.push(status);
          }
          
          // Salva no localStorage
          salvarTarefasLocal(tarefasAtualizadas);
          
          return tarefasAtualizadas;
        });
        
        // Atualiza o status de processamento
        if (status.status === "concluido") {
          setStatusProcessamento("concluido");
          toast.success(`Transcrição concluída com sucesso em ${status.tempo_processamento?.toFixed(2) || "?"} segundos!`);
          clearInterval(intervalId);
          
          // Reseta o estado para permitir novos uploads
          setArquivo(null);
          setStatusProcessamento("ocioso");
        } else if (status.status === "erro") {
          setStatusProcessamento("ocioso");
          toast.error(`Erro na transcrição: ${status.erro || "Erro desconhecido"}`);
          clearInterval(intervalId);
          
          // Reseta o estado para permitir novos uploads
          setArquivo(null);
        }
      } catch (error) {
        console.error("Erro ao verificar status da tarefa:", error);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [tarefaAtual, statusBackend]);

  // Verifica se há alguma tarefa em andamento
  useEffect(() => {
    const verificarTarefasEmAndamento = () => {
      const tarefasEmAndamento = tarefas.some(
        t => t.status === "enfileirado" || t.status === "processando" || t.status === "transcrevendo"
      );
      setProcessandoTarefa(tarefasEmAndamento);
    };

    verificarTarefasEmAndamento();
  }, [tarefas]);

  // Estima o tempo de processamento com base no tamanho do arquivo e no modelo selecionado
  const estimarTempoProcessamento = (arquivo: File, modelo: string): number => {
    // Tamanho em MB
    const tamanhoMB = arquivo.size / (1024 * 1024);
    
    // Fatores de multiplicação aproximados para cada modelo (valores hipotéticos)
    const fatoresModelo: Record<string, number> = {
      tiny: 0.5,
      base: 1,
      small: 2,
      medium: 4,
      large: 8
    };
    
    // Tempo base: aproximadamente 1 segundo por MB para o modelo base em CPU
    const tempoBase = tamanhoMB;
    
    // Ajuste pelo modelo
    const tempoAjustado = tempoBase * (fatoresModelo[modelo] || 1);
    
    // Ajuste pelo dispositivo (CUDA é aproximadamente 3x mais rápido)
    const fatorDispositivo = dispositivo === "cuda" ? 0.3 : 1;
    
    return Math.round(tempoAjustado * fatorDispositivo);
  };

  const handleSubmit = async () => {
    if (!arquivo) {
      toast.error("Por favor, selecione um arquivo de áudio.");
      return;
    }

    if (statusBackend === "offline") {
      toast.error("O servidor backend não está disponível. Verifique se ele está rodando.");
      return;
    }

    if (processandoTarefa) {
      toast.warning("Já existe uma tarefa em andamento. Aguarde a conclusão antes de enviar um novo arquivo.");
      return;
    }

    // Estima o tempo de processamento
    const tempoEstimado = estimarTempoProcessamento(arquivo, modelo);
    setTempoEstimado(tempoEstimado);
    
    // Atualiza o status para "enviando"
    setStatusProcessamento("enviando");
    toast.info("Enviando arquivo para o servidor...");

    try {
      // Inicia o envio do arquivo
      
      const resultado = await enviarParaTranscricao({
        arquivo,
        modelo,
        formato,
        dispositivo,
        idioma,
        tarefa,
      });
      
      // Armazena o ID da tarefa
      setTarefaAtual(resultado.id);
      
      // Cria um objeto de tarefa para armazenar localmente
      const novaTarefa: StatusTarefa = {
        id: resultado.id,
        nome_arquivo: arquivo.name,
        modelo,
        formato,
        dispositivo,
        idioma,
        tarefa,
        status: "enfileirado",
        data_criacao: new Date().toISOString(),
        progresso: 0
      };
      
      // Adiciona a tarefa à lista local
      setTarefas(tarefas => {
        const tarefasAtualizadas = [...tarefas, novaTarefa];
        salvarTarefasLocal(tarefasAtualizadas);
        return tarefasAtualizadas;
      });
      
      // Muda para a aba de tarefas
      setAbaAtiva("tarefas");
      
      // Atualiza o status para "processando"
      setStatusProcessamento("processando");
      toast.info(`Arquivo enviado com sucesso! ID da tarefa: ${resultado.id}`);
      toast.info(`Processando transcrição... Isso pode levar aproximadamente ${tempoEstimado} segundos.`);
      
      // Recarrega a lista de tarefas
      await carregarTarefas();
    } catch (error) {
      console.error("Erro ao transcrever:", error);
      
      // Mensagem de erro mais específica
      if (error instanceof Error) {
        if (error.message.includes("Network Error")) {
          toast.error("Erro de conexão com o servidor. Verifique se o backend está rodando.");
          setStatusBackend("offline");
        } else if (error.message.includes("timeout")) {
          toast.error("O servidor demorou muito para responder. O arquivo pode ser muito grande ou o modelo muito complexo.");
        } else {
          toast.error(`Erro ao processar a transcrição: ${error.message}`);
        }
      } else {
        toast.error("Erro desconhecido ao processar a transcrição. Tente novamente.");
      }
      
      setStatusProcessamento("ocioso");
    }
  };

  // Função para baixar o resultado de uma tarefa
  const handleDownload = async (tarefa: StatusTarefa) => {
    try {
      setDownloadingId(tarefa.id);
      await baixarResultadoTarefa(tarefa.id);
      toast.success("Download concluído com sucesso!");
    } catch (error) {
      console.error("Erro ao baixar resultado:", error);
      toast.error("Erro ao baixar o resultado da transcrição.");
    }
  };

  // Função para atualizar a lista de tarefas
  const handleRefresh = async () => {
    toast.info("Atualizando lista de tarefas...");
    await carregarTarefas();
    toast.success("Lista de tarefas atualizada!");
  };

  // Função para reenviar uma tarefa que falhou
  const handleReenviar = async (tarefa: StatusTarefa) => {
    try {
      // Se temos o arquivo original, podemos reenviar diretamente
      if (arquivo && arquivo.name === tarefa.nome_arquivo) {
        toast.info(`Reenviando tarefa ${tarefa.id}...`);
        
        const resultado = await reenviarTarefa(tarefa.id, arquivo);
        
        toast.success(`Tarefa reenviada com sucesso! ID: ${resultado.id}`);
        
        // Atualiza a lista de tarefas
        await carregarTarefas();
        
        // Atualiza a tarefa atual para monitoramento
        setTarefaAtual(resultado.id);
      } else {
        // Se não temos o arquivo, precisamos pedir ao usuário para fazer upload novamente
        setTarefaReenvio(tarefa);
        
        // Abre o seletor de arquivo
        if (fileInputRef.current) {
          fileInputRef.current.click();
        } else {
          toast.error("Não foi possível abrir o seletor de arquivo. Por favor, faça upload manualmente.");
        }
      }
    } catch (error) {
      console.error("Erro ao reenviar tarefa:", error);
      
      if (error instanceof Error) {
        toast.error(`Erro ao reenviar tarefa: ${error.message}`);
      } else {
        toast.error("Erro desconhecido ao reenviar tarefa.");
      }
    }
  };

  // Handler para quando o usuário seleciona um arquivo para reenvio
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    
    if (!files || files.length === 0 || !tarefaReenvio) {
      return;
    }
    
    const file = files[0];
    setArquivo(file);
    
    try {
      toast.info(`Reenviando tarefa ${tarefaReenvio.id} com novo arquivo...`);
      
      const resultado = await reenviarTarefa(tarefaReenvio.id, file);
      
      toast.success(`Tarefa reenviada com sucesso! ID: ${resultado.id}`);
      
      // Atualiza a lista de tarefas
      await carregarTarefas();
      
      // Atualiza a tarefa atual para monitoramento
      setTarefaAtual(resultado.id);
      
      // Limpa a referência à tarefa de reenvio
      setTarefaReenvio(null);
    } catch (error) {
      console.error("Erro ao reenviar tarefa com novo arquivo:", error);
      
      if (error instanceof Error) {
        toast.error(`Erro ao reenviar tarefa: ${error.message}`);
      } else {
        toast.error("Erro desconhecido ao reenviar tarefa.");
      }
      
      // Limpa a referência à tarefa de reenvio
      setTarefaReenvio(null);
    }
    
    // Limpa o input de arquivo para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Texto do botão com base no status
  const getButtonText = () => {
    switch (statusProcessamento) {
      case "enviando":
        return "Enviando arquivo...";
      case "processando":
        return `Processando... (${tempoEstimado ? `~${tempoEstimado}s` : 'calculando...'})`;
      case "concluido":
        return "Transcrição concluída!";
      default:
        return "Transcrever Áudio";
    }
  };

  // Função para obter a cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "enfileirado":
        return "text-yellow-500";
      case "processando":
      case "transcrevendo":
        return "text-blue-500";
      case "concluido":
        return "text-green-500";
      case "erro":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  // Função para obter o texto do status
  const getStatusText = (status: string) => {
    switch (status) {
      case "enfileirado":
        return "Na fila";
      case "processando":
        return "Preparando...";
      case "carregando_modelo":
        return "Carregando modelo...";
      case "transcrevendo":
        return "Transcrevendo áudio...";
      case "concluido":
        return "Concluído";
      case "erro":
        return "Erro";
      default:
        return status;
    }
  };

  // Função para limpar o formulário
  const handleLimpar = () => {
    setArquivo(null);
    setStatusProcessamento("ocioso");
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Input de arquivo oculto para reenvio */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        accept="audio/*"
      />

      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Whisper Web UI</h1>
        <p className="text-muted-foreground">
          Interface web para transcrição de áudio usando o modelo Whisper da OpenAI
        </p>
        {statusBackend === "offline" && (
          <div className="mt-2 text-red-500 text-sm font-medium">
            ⚠️ Servidor backend não está disponível. Verifique se ele está rodando.
          </div>
        )}
        {statusBackend === "verificando" && (
          <div className="mt-2 text-yellow-500 text-sm font-medium">
            ⏳ Verificando conexão com o servidor...
          </div>
        )}
      </header>

      <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="nova">Nova Transcrição</TabsTrigger>
          <TabsTrigger value="tarefas">Tarefas ({tarefas.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="nova">
          <Card>
            <CardHeader>
              <CardTitle>Nova Transcrição</CardTitle>
              <CardDescription>
                Faça upload de um arquivo de áudio para transcrever usando o modelo Whisper
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Arquivo de Áudio</label>
                <Dropzone
                  onDrop={(files: File[]) => {
                    console.log("Arquivo recebido:", files);
                    if (files.length > 0) {
                      setArquivo(files[0]);
                    }
                  }}
                  maxFiles={1}
                  className="w-full"
                  disabled={statusProcessamento !== "ocioso" || processandoTarefa}
                  accept={{
                    'audio/*': ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac']
                  }}
                />
                {arquivo && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Arquivo selecionado: {arquivo.name} ({formatarTamanhoArquivo(arquivo.size)})
                  </p>
                )}
                {processandoTarefa && (
                  <p className="mt-2 text-sm text-yellow-500">
                    Existe uma tarefa em andamento. Aguarde a conclusão antes de enviar um novo arquivo.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Modelo</label>
                  <Select value={modelo} onValueChange={setModelo} disabled={statusProcessamento !== "ocioso"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tiny">Tiny (rápido, menos preciso)</SelectItem>
                      <SelectItem value="base">Base (equilíbrio)</SelectItem>
                      <SelectItem value="small">Small (recomendado)</SelectItem>
                      <SelectItem value="medium">Medium (mais preciso)</SelectItem>
                      <SelectItem value="large">Large (mais lento, mais preciso)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Formato de Saída</label>
                  <Select value={formato} onValueChange={setFormato} disabled={statusProcessamento !== "ocioso"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o formato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="txt">Texto (TXT)</SelectItem>
                      <SelectItem value="srt">Legendas (SRT)</SelectItem>
                      <SelectItem value="vtt">Legendas Web (VTT)</SelectItem>
                      <SelectItem value="json">JSON (detalhado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Dispositivo</label>
                  <Select value={dispositivo} onValueChange={setDispositivo} disabled={statusProcessamento !== "ocioso"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o dispositivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpu">CPU</SelectItem>
                      <SelectItem value="cuda">CUDA (NVIDIA GPU)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Idioma</label>
                  <Select value={idioma} onValueChange={setIdioma} disabled={statusProcessamento !== "ocioso"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Detecção Automática</SelectItem>
                      <SelectItem value="pt">Português</SelectItem>
                      <SelectItem value="en">Inglês</SelectItem>
                      <SelectItem value="es">Espanhol</SelectItem>
                      <SelectItem value="fr">Francês</SelectItem>
                      <SelectItem value="de">Alemão</SelectItem>
                      <SelectItem value="it">Italiano</SelectItem>
                      <SelectItem value="ja">Japonês</SelectItem>
                      <SelectItem value="zh">Chinês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tarefa</label>
                <Select value={tarefa} onValueChange={setTarefa} disabled={statusProcessamento !== "ocioso"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a tarefa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transcricao">Transcrição (manter idioma original)</SelectItem>
                    <SelectItem value="traducao">Tradução (para inglês)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleLimpar}
                disabled={!arquivo || statusProcessamento !== "ocioso"}
              >
                Limpar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!arquivo || statusProcessamento !== "ocioso" || statusBackend !== "online" || processandoTarefa}
              >
                {processandoTarefa ? "Aguarde a conclusão da tarefa atual..." : getButtonText()}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="tarefas">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tarefas de Transcrição</CardTitle>
                <CardDescription>
                  Acompanhe o status das suas transcrições
                </CardDescription>
              </div>
              <Button variant="outline" onClick={handleRefresh}>
                Atualizar
              </Button>
            </CardHeader>
            <CardContent>
              {tarefas.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma tarefa encontrada. Inicie uma nova transcrição.
                </p>
              ) : (
                <div className="space-y-4">
                  {tarefas.map((tarefa) => (
                    <div key={tarefa.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">{tarefa.nome_arquivo}</h3>
                          <p className="text-sm text-muted-foreground">
                            Modelo: {tarefa.modelo}, Formato: {tarefa.formato}
                          </p>
                        </div>
                        <div className={`font-medium ${getStatusColor(tarefa.status)}`}>
                          {getStatusText(tarefa.status)}
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-2">
                        Criado em: {formatarData(tarefa.data_criacao)}
                      </div>
                      
                      {/* Barra de progresso */}
                      {tarefa.status !== "concluido" && tarefa.status !== "erro" && (
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full" 
                            style={{ width: `${tarefa.progresso || 0}%` }}
                          ></div>
                        </div>
                      )}
                      
                      {tarefa.tempo_processamento && (
                        <div className="text-sm text-muted-foreground mb-2">
                          Tempo de processamento: {tarefa.tempo_processamento.toFixed(2)}s
                        </div>
                      )}
                      
                      {tarefa.erro && (
                        <div className="text-sm text-red-500 mb-2">
                          Erro: {tarefa.erro}
                        </div>
                      )}
                      
                      <div className="flex space-x-2 mt-2">
                        {tarefa.status === "concluido" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(tarefa)}
                            disabled={tarefa.status !== "concluido" || downloadingId === tarefa.id}
                          >
                            {downloadingId === tarefa.id ? "Baixando..." : "Baixar"}
                          </Button>
                        )}
                        
                        {tarefa.status === "erro" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleReenviar(tarefa)}
                          >
                            Tentar Novamente
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 