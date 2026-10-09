/* CursorJS - Tutor IA interno (100% local, baseado em regras e base de conhecimento) */
const KB = {
  var: { t: "Variáveis", k: /variavel|variável|let|const|var\b/i, a: "Use `const` para valores que não mudam e `let` para os que mudam. Evite `var`.\n```js\nconst nome = 'Ana';\nlet contador = 0;\ncontador++;\n```" },
  str: { t: "Strings", k: /string|texto|letra|caracter|slice|split|replace/i, a: "Strings têm métodos úteis: `length`, `toUpperCase()`, `includes()`, `slice(i, j)`, `split(sep)`, `replaceAll()`. Strings são imutáveis: os métodos devolvem uma nova string.\n```js\n'js é top'.toUpperCase(); // 'JS É TOP'\n```" },
  cond: { t: "Condições", k: /if|else|condic|ternario|ternário|switch/i, a: "Use `if / else if / else` para decidir. O ternário é um atalho:\n```js\nconst r = n % 2 === 0 ? 'par' : 'impar';\n```\nPrefira `===` a `==` para comparar." },
  bool: { t: "Booleanos", k: /boolean|booleano|true|false|verdadeiro/i, a: "Comparações (`>`, `===`, `!==`) já resultam em `true` ou `false`. Você pode retorná-las direto: `return idade >= 18;`. Combine com `&&` (e), `||` (ou), `!` (não)." },
  loop: { t: "Laços", k: /for|while|laco|laço|loop|repeti|iterar/i, a: "`for` repete com contador; `for...of` percorre itens; `while` repete enquanto a condição for verdadeira.\n```js\nlet total = 0;\nfor (const x of [1,2,3]) total += x;\n```\nO padrão do **acumulador** (começar em 0 e somar) resolve muitos problemas." },
  array: { t: "Arrays", k: /array|lista|vetor|push|pop|indice|índice/i, a: "Arrays guardam listas. Métodos: `push`, `pop`, `slice`, `includes`, `indexOf`, `concat`. O primeiro índice é `0` e o último é `length - 1`.\n```js\nconst a = [10, 20];\na.push(30); // [10,20,30]\n```" },
  hof: { t: "map / filter / reduce", k: /map|filter|reduce|callback|funcao de ordem|função de ordem/i, a: "- `map` transforma cada item\n- `filter` mantém itens que passam no teste\n- `reduce` junta tudo em um valor\n```js\n[1,2,3].map(x => x * 2);          // [2,4,6]\n[1,2,3].filter(x => x > 1);       // [2,3]\n[1,2,3].reduce((a, x) => a + x, 0); // 6\n```" },
  obj: { t: "Objetos", k: /objeto|object|chave|propriedade|json/i, a: "Objetos guardam pares chave/valor: `const p = { nome: 'Ana', idade: 20 }`. Acesse com `p.nome` ou `p['nome']`. Use `Object.keys/values/entries` para percorrer." },
  func: { t: "Funções", k: /funcao|função|function|arrow|parametro|parâmetro|argumento/i, a: "Funções recebem parâmetros e devolvem resultado com `return`.\n```js\nfunction soma(a, b) { return a + b; }\nconst soma2 = (a, b) => a + b;\n```\nFunções também são valores: podem ser passadas e retornadas." },
  ret: { t: "return", k: /return|retorn/i, a: "`return` devolve o valor da função e encerra sua execução. `console.log` apenas mostra no console — os testes avaliam o valor **retornado**." },
  math: { t: "Matemática", k: /math|raiz|arredond|resto|modulo|módulo|%/i, a: "Operadores: `+ - * / %` (resto) e `**` (potência). `Math.floor`, `Math.ceil`, `Math.round`, `Math.sqrt`, `Math.max`, `Math.min`.\nUm número é par se `n % 2 === 0`." },
  set: { t: "Set", k: /set\b|unico|único|duplicad|repetid/i, a: "`Set` guarda valores sem repetição.\n```js\n[...new Set([1,1,2])]; // [1,2]\n```" },
  sort: { t: "Ordenação", k: /sort|ordenar|ordena|comparador/i, a: "`sort` altera o array original e, sem função, ordena como texto! Para números use comparador:\n```js\n[10, 2, 5].sort((a, b) => a - b); // [2,5,10]\n```\nUse `[...lista].sort(...)` para não alterar o original." },
  recursion: { t: "Recursão", k: /recurs/i, a: "Recursão é a função chamando a si mesma. Todo problema recursivo precisa de:\n1. **caso base** (quando parar)\n2. **passo recursivo** (aproximar do caso base)\n```js\nconst fat = n => n <= 1 ? 1 : n * fat(n - 1);\n```" },
  closure: { t: "Closures", k: /closure|escopo|lembra/i, a: "Closure: uma função interna 'lembra' das variáveis do escopo onde foi criada, mesmo depois da externa terminar.\n```js\nfunction contador() { let n = 0; return () => ++n; }\n```" },
  async: { t: "Assíncrono", k: /async|await|promise|assincron|assíncron|settimeout/i, a: "`Promise` representa um valor futuro. `async` faz a função retornar Promise e `await` espera o resultado.\n```js\nconst esperar = ms => new Promise(r => setTimeout(r, ms));\nasync function f() { await esperar(100); return 'ok'; }\n```" },
  err: { t: "Erros comuns", k: /erro|error|undefined|nao funciona|não funciona|bug/i, a: "Erros comuns: esquecer o `return`, usar `=` em vez de `===`, errar o limite do laço (`<` vs `<=`), alterar o array original e esquecer de fechar `{ }` ou `( )`. Use **Revisar código** para eu analisar o seu." }
};

const Tutor = {
  explain(ch) {
    const extras = (ch.tp || []).map(k => KB[k]).filter(Boolean).map(e => `**${e.t}**\n${e.a}`).join("\n\n");
    return `**${ch.t}** (nível ${ch.lvl})\n${ch.d}\n\nA função deve se chamar \`${ch.fn}(${ch.p})\` e **retornar** o resultado.\n\n${extras}`;
  },

  hint(ch, used) {
    const i = Math.min(used, ch.h.length - 1);
    const left = ch.h.length - 1 - i;
    const tail = left > 0 ? `\n\n_(${left} dica(s) restante(s))_` : "\n\n_Essa era a última dica. Ainda travado? Peça a solução comentada._";
    return `**Dica ${i + 1}/${ch.h.length}:** ${ch.h[i]}${tail}`;
  },

  solution(ch) {
    return `Solução do desafio **${ch.t}**:\n\`\`\`js\n${ch.sol}\n\`\`\`\nTente entender cada linha e refaça sem olhar depois. Para esse desafio você não ganha XP.`;
  },

  syntaxMsg(m) {
    if (/Unexpected end of input/i.test(m)) return "Falta fechar algo: `}`, `)` ou `]`.";
    if (/Unexpected token/i.test(m)) return `Token inesperado (${m.replace(/.*Unexpected token/i, "").trim()}). Verifique vírgulas, parênteses e chaves próximos dessa parte.`;
    if (/Unexpected identifier/i.test(m)) return "Identificador inesperado: talvez falte `;`, `,` ou um operador antes dele.";
    if (/Invalid or unexpected/i.test(m)) return "Há um caractere inválido ou aspas não fechadas.";
    return m;
  },

  // Análise estática do código + análise dos resultados dos testes
  review(code, ch, results) {
    const out = [];
    const add = (type, msg) => out.push({ type, msg });
    if (code.trim() === ch.start.trim()) { add("warn", "Você ainda não alterou o código inicial. Comece pelo return dentro da função."); return out; }
    try { new Function(code); } catch (e) { add("err", "Erro de sintaxe: " + this.syntaxMsg(e.message)); return out; }
    const cnt = (a, b) => (code.split(a).length - 1) - (code.split(b).length - 1);
    if (cnt("{", "}") !== 0) add("err", "Chaves `{ }` desbalanceadas.");
    if (cnt("(", ")") !== 0) add("err", "Parênteses `( )` desbalanceados.");
    if (cnt("[", "]") !== 0) add("err", "Colchetes `[ ]` desbalanceados.");
    const nome = new RegExp(`function\\s+${ch.fn}\\b|(const|let|var)\\s+${ch.fn}\\s*=`);
    if (!nome.test(code)) add("err", `A função precisa se chamar \`${ch.fn}\`.`);
    if (!/\breturn\b/.test(code) && !/=>\s*[^{\s]/.test(code)) add("warn", "Sua função não usa `return`. Os testes avaliam o valor retornado.");
    if (/console\.log/.test(code) && !/\breturn\b/.test(code)) add("warn", "`console.log` só mostra na tela; use `return` para devolver o resultado.");
    if (/\bif\s*\([^=!<>()]*[^=!<>]=[^=][^)]*\)/.test(code)) add("warn", "Parece haver `=` (atribuição) dentro de um `if`. Para comparar use `===`.");
    if (/[^=!]==[^=]/.test(code)) add("info", "Prefira `===` em vez de `==` para evitar conversões inesperadas.");
    if (/\bvar\b/.test(code)) add("info", "Prefira `let`/`const` em vez de `var`.");
    if (/while\s*\(\s*true\s*\)/.test(code) && !/break|return/.test(code)) add("warn", "`while(true)` sem `break`/`return` gera laço infinito.");

    if (results && results.length) {
      const fails = results.filter(r => !r.ok);
      if (!fails.length) add("ok", "Todos os testes passaram. Bom trabalho! Veja se dá para deixar o código mais simples.");
      else {
        add("info", `${results.length - fails.length}/${results.length} testes passando.`);
        const f = fails[0];
        if (f.err) add("err", `Ao executar ocorreu: ${f.err}`);
        else add("warn", this.diagnose(f));
      }
    } else add("info", "Rode os testes para eu fazer uma análise mais precisa.");
    if (!out.length) add("ok", "Nenhum problema óbvio no código.");
    return out;
  },

  diagnose(r) {
    const g = r.got, e = r.exp, tg = typeof g, te = typeof e;
    if (g === undefined) return "Sua função retornou `undefined`: provavelmente falta o `return` ou ele está no lugar errado.";
    if (tg !== te) return `Tipo diferente: esperado ${te}, recebido ${tg}. Verifique conversões e o que você retorna.`;
    if (tg === "string" && g.toLowerCase() === e.toLowerCase()) return "O texto está certo, mas maiúsculas/minúsculas estão diferentes.";
    if (tg === "string" && g.trim() === e.trim()) return "Há espaços sobrando ou faltando no texto.";
    if (tg === "number" && Math.abs(g - e) === 1) return "Erro por 1 (off-by-one): revise os limites do laço (`<` vs `<=`) e o valor inicial.";
    if (tg === "number" && g === 0) return "Resultado 0: o acumulador pode não estar sendo atualizado, ou o laço não executa.";
    if (Array.isArray(g) && Array.isArray(e)) {
      if (g.length !== e.length) return `O array tem ${g.length} item(ns), mas deveria ter ${e.length}. Revise o filtro/laço.`;
      if (JSON.stringify([...g].reverse()) === JSON.stringify(e)) return "Os itens estão corretos, mas na ordem inversa.";
      if (JSON.stringify([...g].sort()) === JSON.stringify([...e].sort())) return "Os itens estão certos, mas em ordem diferente da esperada.";
      return "O array tem o tamanho certo, mas o conteúdo difere. Confira a transformação de cada item.";
    }
    if (tg === "boolean") return "Resultado booleano invertido: confira o sentido da comparação.";
    return "O valor retornado é diferente do esperado. Compare com a tabela de testes e simule seu código à mão.";
  },

  nextStep(state, total) {
    const done = Object.keys(state.done).length;
    if (done === total) return "Você concluiu todos os desafios! Refaça os mais difíceis sem dicas ou crie suas próprias variações.";
    const pend = CHALLENGES.filter(c => !state.done[c.id]);
    const prox = pend[0];
    const usaDicas = Object.values(state.done).filter(d => d.hints >= 2).length;
    const nota = usaDicas > done / 2 ? " Você tem usado muitas dicas: tente primeiro escrever o passo a passo em português antes de codar." : "";
    return `Próximo recomendado: **#${prox.id} ${prox.t}** (nível ${prox.lvl}). Progresso: ${done}/${total}.${nota}`;
  },

  // Chat livre: tenta casar a pergunta com a base de conhecimento
  answer(q, ch) {
    const s = q.toLowerCase();
    if (/^(oi|ola|olá|e ai|eai|bom dia|boa tarde|boa noite)/.test(s)) return "Olá! Posso dar **dicas**, **explicar** o desafio, **revisar seu código** ou tirar dúvidas de JavaScript.";
    if (/obrigad|valeu/.test(s)) return "Por nada! Continue praticando.";
    if (/o que (é|e) (o )?cursorjs|quem criou/.test(s)) return "CursorJS é uma plataforma de 50 desafios para aprender JavaScript, com tutor IA local, sem APIs externas.";
    const hits = Object.values(KB).filter(e => e.k.test(s));
    if (hits.length) return hits.slice(0, 2).map(e => `**${e.t}**\n${e.a}`).join("\n\n");
    return `Não encontrei esse tema na minha base. Tente perguntar sobre: array, string, laço, função, objeto, map/filter/reduce, recursão, closure, async. Ou use **Dica** para o desafio atual (${ch.t}).`;
  }
};
