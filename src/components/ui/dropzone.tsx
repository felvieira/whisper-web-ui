import * as React from "react"
import { useDropzone, type DropzoneOptions } from "react-dropzone"
import { cn } from "@/lib/utils"
import { Upload } from "lucide-react"

interface DropzoneProps extends Omit<DropzoneOptions, "className"> {
  className?: string
  onDrop: (files: File[]) => void
}

export function Dropzone({ className, onDrop, ...props }: DropzoneProps) {
  // Referência para o elemento de input
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Configuração do dropzone com tratamento de erros melhorado
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (acceptedFiles) => {
      console.log("Arquivos aceitos:", acceptedFiles)
      if (acceptedFiles && acceptedFiles.length > 0) {
        onDrop(acceptedFiles)
      }
    },
    noClick: false, // Permite clicar para abrir o seletor de arquivos
    noKeyboard: false, // Permite usar o teclado para selecionar arquivos
    multiple: false, // Permite apenas um arquivo
    ...props,
    // Se o usuário não especificar os tipos aceitos, use os padrões
    accept: props.accept || {
      "audio/*": [".mp3", ".wav", ".flac", ".m4a", ".ogg", ".opus", ".aac"],
    },
  })

  // Função para lidar com o clique no botão
  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation() // Impede a propagação do evento
    open() // Abre o seletor de arquivos
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg border border-dashed p-6 transition-colors",
        isDragActive
          ? "border-primary/50 bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5",
        props.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className
      )}
      onClick={(e) => {
        if (props.disabled) {
          e.stopPropagation()
          e.preventDefault()
        }
      }}
    >
      <input {...getInputProps()} ref={inputRef} />
      <Upload className="h-10 w-10 text-muted-foreground" />
      <p className="mt-2 text-sm text-center text-muted-foreground">
        {isDragActive ? (
          "Solte o arquivo aqui..."
        ) : props.disabled ? (
          "Upload desativado durante o processamento"
        ) : (
          <>
            Arraste e solte um arquivo de áudio aqui, ou{" "}
            <button
              type="button"
              className="text-primary hover:underline focus:outline-none"
              onClick={handleButtonClick}
              disabled={props.disabled}
            >
              clique para selecionar
            </button>
            <br />
            <span className="text-xs">
              (Formatos suportados: MP3, WAV, FLAC, M4A, OGG, OPUS, AAC)
            </span>
          </>
        )}
      </p>
    </div>
  )
} 