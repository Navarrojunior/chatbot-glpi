// ==========================================================================
// *Projeto desenvolvido por: Adalbert Navarro 
// *Função: [Chatbot Integrado com WhatsApp e GLPI] 
// *Última atualização: [fev/2026] 
// *Contato: adalbertcs013@gmail.com | linkedin.com/in/adalbert-navarro-navarro-45b28433a 
// ==========================================================================

// =====================================
// IMPORTAÇÕES
// =====================================
require("dotenv").config();
const qrcode = require("qrcode-terminal");
const axios = require("axios");
const { Client, LocalAuth } = require("whatsapp-web.js");

// =====================================
// CONFIGURAÇÃO DO CLIENTE WHATSAPP
// =====================================
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--single-process",
    ],
  },
});

const userState = {};

// =====================================
// CONTROLE DE SESSÃO
// =====================================
const SESSION_TIMEOUT = 5 * 60 * 1000; // 2 minutos

function iniciarTimeout(userId) {
  if (userState[userId]?.timeout) {
    clearTimeout(userState[userId].timeout);
  }
  userState[userId].timeout = setTimeout(async () => {
    try {
      await client.sendMessage(
        userId,
        "⏱️ Sessão encerrada por inatividade.\nEnvie *menu* para iniciar novamente."
      );
    } catch (e) {}
    delete userState[userId];
  }, SESSION_TIMEOUT);
}

function encerrarSessao(userId) {
  if (userState[userId]?.timeout) {
    clearTimeout(userState[userId].timeout);
  }
  delete userState[userId];
}

// =====================================
// GLPI - FUNÇÕES
// =====================================
async function initGLPISession() {
  const res = await axios.get(`${process.env.GLPI_URL}/initSession`, {
    headers: {
      "App-Token": process.env.APP_TOKEN,
      "Authorization": `user_token ${process.env.USER_TOKEN}`,
    },
  });
  return res.data.session_token;
}

async function criarChamadoGLPI({ descricao, telefone, dadosUsuario }) {
  const sessionToken = await initGLPISession();
  const corpoChamado = `
👤 *DADOS DO SOLICITANTE*
- *Nome:* ${dadosUsuario.nome}
- *Setor:* ${dadosUsuario.setor}
- *WhatsApp:* ${telefone}

📝 *DESCRIÇÃO DO PROBLEMA*
${descricao}
`.trim();

  const res = await axios.post(
    `${process.env.GLPI_URL}/Ticket`,
    {
      input: {
        name: `Chamado via WhatsApp - ${dadosUsuario.nome}`,
        content: corpoChamado,
        itilcategories_id: process.env.ITIL_CATEGORY_ID,
        priority: 3,
      },
    },
    {
      headers: {
        "App-Token": process.env.APP_TOKEN,
        "Session-Token": sessionToken,
        "Content-Type": "application/json",
      },
    }
  );
  return res.data.id;
}

async function consultarChamadoGLPI(ticketId) {
  const sessionToken = await initGLPISession();
  const res = await axios.get(`${process.env.GLPI_URL}/Ticket/${ticketId}`, {
    headers: {
      "App-Token": process.env.APP_TOKEN,
      "Session-Token": sessionToken,
    },
  });
  return res.data;
}

// =====================================
// EVENTOS WHATSAPP
// =====================================
client.on("qr", (qr) => {
  console.log("📲 Escaneie o QR Code abaixo:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => console.log("✅ WhatsApp conectado!"));
client.initialize();

// =====================================
// FUNIL
// =====================================
client.on("message", async (msg) => {
  try {
    if (!msg.from || msg.from.endsWith("@g.us")) return;

    const texto = msg.body?.trim() || "";
    const textoLower = texto.toLowerCase();

    // RESET / MENU
    if (!userState[msg.from] || /^(menu|oi|olá|ola|bom dia|boa tarde|boa noite)$/i.test(textoLower)) {
      userState[msg.from] = { step: "menu_inicial" };
      iniciarTimeout(msg.from);

      await msg.reply(
        `🤖 *Suporte de TI*

Escolha uma opção:
1️⃣ Abrir chamado
2️⃣ Acompanhar chamado`
      );
      return;
    }

    const state = userState[msg.from];
    iniciarTimeout(msg.from);

    // MENU INICIAL
    if (state.step === "menu_inicial") {
      if (texto === "1") {
        state.step = "aguardando_nome";
      await msg.reply("Informe seu *Nome*:");
    } else if (texto === "2") {
      state.step = "consultar_chamado";
      await msg.reply("📄 Informe o número do chamado:");
    } else {
      await msg.reply("❗ Digite 1 ou 2.");
    }
      return;
    }

    // NOME
    if (state.step === "aguardando_nome") {
      state.nome = texto;
      state.step = "aguardando_setor";
      await msg.reply("Qual o seu *Setor*?");
      return;
    }

    // SETOR
    if (state.step === "aguardando_setor") {
      state.setor = texto;
      state.step = "menu_tipo";

      await msg.reply(
        `Escolha o *tipo de chamado*:
1️⃣ PC/Notebook
2️⃣ Internet
3️⃣ Sistemas
4️⃣ Impressoras
5️⃣ Solicitação`
      );
      return;
    }

    // TIPO
    if (state.step === "menu_tipo") {
      const tipos = {
        "1": "PC/Notebook",
        "2": "Internet",
        "3": "Sistemas",
        "4": "Impressoras",
        "5": "Solicitação"
      };

      if (!tipos[texto]) {
        await msg.reply("❗ Opção inválida.");
        return;
      }

      state.tipoChamado = tipos[texto];
      state.step = "abrir_chamado";
      await msg.reply("📝 Descreva o problema:");
      return;
    }

    // ABRIR
    if (state.step === "abrir_chamado") {
      const id = await criarChamadoGLPI({
        descricao: texto,
        telefone: msg.from,
        dadosUsuario: state,
      });

      await msg.reply(`✅ *Chamado ${id} aberto com sucesso!*`);
      encerrarSessao(msg.from);
      return;
    }

    // CONSULTAR
    if (state.step === "consultar_chamado") {
      const ticketId = texto.replace(/\D/g, "");
      if (!ticketId) {
        await msg.reply("❌ Número inválido.");
        return;
      }

      const STATUS_GLPI = {
        1: "🆕 Novo",
        2: "📌 Em atendimento",
        3: "🧪 Em teste",
        4: "⏸️ Pendente",
        5: "✅ Resolvido",
        6: "❌ Fechado",
      };

      const ticket = await consultarChamadoGLPI(ticketId);
      const statusTexto =
        STATUS_GLPI[ticket.status] || `⚠️ Status desconhecido (${ticket.status})`;

      await client.sendMessage(
        msg.from,
        `📄 *Chamado ${ticket.id}*
📊 *Status:* ${statusTexto}`
      );
      encerrarSessao(msg.from);
      return;
    }
  } catch (error) {
    console.error("❌ Erro:", error);
    encerrarSessao(msg.from);
  }
});
