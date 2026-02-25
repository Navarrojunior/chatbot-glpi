# chatbot-glpi
Sistema de Automação de Chamados com ChatBot e GLPI

# 🤖 Chatbot Integrado com WhatsApp e GLPI

## ✨ Sobre
Este projeto foi desenvolvido por **Adalbert Navarro** e consiste em um **chatbot integrado ao WhatsApp e ao GLPI**.  
O objetivo é permitir que usuários abram chamados diretamente pelo WhatsApp, enquanto o chatbot conduz a interação e, ao final, envia os dados para o GLPI, criando automaticamente o chamado.

## 🚀 Funcionalidades
- Interação automatizada com usuários via WhatsApp.  
- Abertura de chamados no GLPI sem necessidade de acessar o sistema manualmente.  
- Integração com APIs para envio e recebimento de informações.  
- Backend simples e direto, sem frameworks, rodando apenas com Node.js.  

## 🛠️ Tecnologias Utilizadas
- **Node.js** (versão recomendada: v20.20.0)  
- **Bibliotecas:**  
  - `dotenv` (para variáveis de ambiente)  
  - Dependências instaladas via `npm`  
- **Integrações:** GLPI API, WhatsApp API  
- **Infraestrutura:** Linux (Ubuntu/Debian), Docker (opcional)  

## 📦 Instalação
Pré-requisitos:  
- Node.js instalado (preferencialmente na versão **v20.20.0**)  
- NPM configurado  

Passos:
```bash
# Clone o repositório
git clone https://github.com/Navarrojunior/chatbot-glpi.git

# Entre na pasta do projeto
cd chatbot-glpi

# Instale as dependências
npm install

# Instale dotenv para variáveis de ambiente
npm install dotenv

# Execute o script usando Node.js
node chatbot.js

