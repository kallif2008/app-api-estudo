import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const analisarFraseInglesService = async (frase) => {
  if (!frase?.trim()) {
    throw new Error("Frase é obrigatória");
  }

  //   const completion = await groq.chat.completions.create({
  //     model: "openai/gpt-oss-120b",
  //     messages: [
  //       {
  //         role: "system",
  //         content: `
  // Você é um professor de inglês para brasileiros.
  // Responda apenas JSON puro, sem markdown, sem código formatado.
  // Explique gramática, uso por nativos e exemplos.
  // {
  //   "traducao": "",
  //   "gramatica": [],
  //   "usoNativo": "",
  //   "exemplos": [],
  //   "observacoes": ""
  // }
  // `,
  //       },
  //       {
  //         role: "user",
  //         content: frase,
  //       },
  //     ],
  //     temperature: 0.3,
  //     max_tokens: 1000,
  //   });

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          'Você é um professor de inglês para brasileiros.\nResponda apenas JSON puro, sem markdown, sem código formatado.\nExplique gramática, uso por nativos e exemplos.\n{\n  "traducao": "",\n  "gramatica": [],\n  "usoNativo": [],\n  "exemplos": [],\n  "observacoes": []\n}',
      },
      {
        role: "assistant",
        content:
          '{\n  "traducao": "Present Perfect (Pretérito Perfeito Composto)",\n  "gramatica": [\n    "Formação: have/has + past participle (verb + ed ou forma irregular).",\n    "Uso principal 1: ação iniciada no passado e que continua no presente (ex.: I have lived here for five years).",\n    "Uso principal 2: ação ocorrida em um tempo não especificado antes de agora (ex.: She has already finished the report).",\n    "Uso principal 3: experiências de vida (ex.: Have you ever been to Japan?).",\n    "Negativa: haven\'t / hasn\'t + past participle.",\n    "Interrogativa: Have/Has + sujeito + past participle?"\n  ],\n  "usoNativo": "Falantes nativos usam o Present Perfect para conectar o passado ao presente, especialmente quando o foco está no resultado atual ou na experiência acumulada, e evitam usá‑lo com marcadores de tempo específicos (como \'yesterday\', \'last year\'), que pedem o Simple Past.",\n  "exemplos": [\n    {\n      "english": "I have known Maria since we were children.",\n      "portuguese": "Eu conheço a Maria desde que éramos crianças."\n    },\n    {\n      "english": "He hasn\'t finished his homework yet.",\n      "portuguese": "Ele ainda não terminou a lição de casa."\n    },\n    {\n      "english": "Have you ever tried sushi?",\n      "portuguese": "Você já experimentou sushi?"\n    },\n    {\n      "english": "They have traveled to three countries this year.",\n      "portuguese": "Eles viajaram para três países este ano."\n    },\n    {\n      "english": "We have just arrived at the airport.",\n      "portuguese": "Acabamos de chegar ao aeroporto."\n    }\n  ],\n  "observacoes": "1. Não se usa o Present Perfect com expressões de tempo fechado (ex.: \'yesterday\', \'last week\').\\n2. Muitos brasileiros confundem o Present Perfect com o Simple Past; pratique distinguindo o foco no presente vs. foco apenas no passado.\\n3. Lembre‑se de usar \'has\' com he/she/it e \'have\' com os demais sujeitos.\\n4. O verbo irregular \'to be\' tem particípio \'been\' (ex.: I\'ve been busy), que costuma gerar dúvidas."\n}',
      },
      {
        role: "user",
        content: frase,
      },
    ],
    model: "openai/gpt-oss-120b",
    temperature: 0.3,
    max_tokens: 1000,
  });

  let resposta = completion.choices?.[0]?.message?.content;

  console.log("Resposta bruta do Groq:", resposta);

  if (!resposta) {
    throw new Error("Resposta vazia do Groq");
  }

  const match = resposta.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    resposta = match[1].trim();
  }

  console.log("resposta tratada", resposta);

  return JSON.parse(resposta);
};

const conversarInglesService = async (contexto, mensagens) => {
  if (!mensagens?.length) {
    throw new Error("Mensagens é obrigatório");
  }

  if (!contexto?.trim()) {
    throw new Error("Contexto é obrigatório");
  }

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      {
        role: "system",
        content: `Você é um parceiro de conversa para prática de inglês, você receberá o texto que o aluno está estudando como contexto para a conversa.

Contexto do aluno:
${contexto}

Regras:
- Escolha assuntos aleatórios.
- Não continue a narrativa original.
- Reutilize naturalmente as palavras aprendidas.
- Faça perguntas curtas.
- Use inglês simples.
- Não use todas as palavras de uma vez.
- Introduza no máximo 1 palavra nova por mensagem.
- Corrija o aluno de forma leve quando necessário.`,
      },
      ...mensagens.map((m) => ({
        role: m.papel === "assistant" ? "assistant" : "user",
        content: m.conteudo,
      })),
    ],
    temperature: 0.7,
    max_tokens: 300,
  });

  const resposta = completion.choices?.[0]?.message?.content;

  if (!resposta) {
    throw new Error("Resposta vazia do Groq");
  }

  return resposta;
};

export { analisarFraseInglesService, conversarInglesService };
