-- Script de criação das tabelas do Laboratório de IDOR / Quebra de Controle de Acesso
-- Todas as tabelas têm uma chave composta (sala, numero): "sala" isola o Lab 1 do Lab 2
-- (igual ao mural de XSS) e "numero" é o ID público e PREVISÍVEL usado nas URLs —
-- de propósito, para os alunos poderem manipulá-lo nos exercícios.

CREATE TABLE IF NOT EXISTS idor_perfis (
    sala VARCHAR(10) NOT NULL,
    numero INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    telefone VARCHAR(30) NOT NULL,
    cargo VARCHAR(100) NOT NULL,
    salario NUMERIC(10,2) NOT NULL,
    cpf VARCHAR(20) NOT NULL,
    bio TEXT NOT NULL,
    papel VARCHAR(10) NOT NULL DEFAULT 'aluno',
    token VARCHAR(30),
    PRIMARY KEY (sala, numero)
);

CREATE TABLE IF NOT EXISTS idor_comprovantes (
    sala VARCHAR(10) NOT NULL,
    numero INTEGER NOT NULL,
    perfil_numero INTEGER NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    descricao VARCHAR(200) NOT NULL,
    PRIMARY KEY (sala, numero)
);

CREATE TABLE IF NOT EXISTS idor_faturas (
    sala VARCHAR(10) NOT NULL,
    numero INTEGER NOT NULL,
    perfil_numero INTEGER NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    descricao VARCHAR(200) NOT NULL,
    PRIMARY KEY (sala, numero)
);

CREATE TABLE IF NOT EXISTS idor_pedidos (
    sala VARCHAR(10) NOT NULL,
    numero INTEGER NOT NULL,
    perfil_numero INTEGER NOT NULL,
    item VARCHAR(200) NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    PRIMARY KEY (sala, numero)
);

CREATE TABLE IF NOT EXISTS idor_chamados (
    sala VARCHAR(10) NOT NULL,
    numero INTEGER NOT NULL,
    perfil_numero INTEGER NOT NULL,
    assunto VARCHAR(200) NOT NULL,
    mensagem TEXT NOT NULL,
    PRIMARY KEY (sala, numero)
);

CREATE TABLE IF NOT EXISTS idor_mensagens (
    sala VARCHAR(10) NOT NULL,
    numero INTEGER NOT NULL,
    perfil_numero INTEGER NOT NULL,
    conteudo TEXT NOT NULL,
    PRIMARY KEY (sala, numero)
);

-- Seeds: os mesmos dados em cada sala (1 e 2), para ficarem isolados mas idênticos
DO $$
DECLARE
    s TEXT;
BEGIN
    FOREACH s IN ARRAY ARRAY['1', '2'] LOOP

        INSERT INTO idor_perfis (sala, numero, nome, email, telefone, cargo, salario, cpf, bio, papel, token) VALUES
            (s, 1, 'Você (Aluno QA)', 'aluno@lab.com', '(11) 90000-0001', 'Estagiário(a) de QA', 1800.00, '000.000.000-00', 'Aprendendo sobre segurança ofensiva', 'aluno', NULL),
            (s, 2, 'Marina Silva', 'marina.silva@empresa-lab.com', '(11) 98877-6655', 'Gerente Financeira', 12300.00, '111.222.333-44', 'Adoro café e planilhas de Excel', 'aluno', NULL),
            (s, 3, 'Carlos Mendes', 'carlos.mendes@empresa-lab.com', '(11) 97766-5544', 'Diretor de TI', 18750.00, '123.456.789-00', '30 anos de carreira em tecnologia', 'aluno', 'TKN-CM-58231'),
            (s, 4, 'Beatriz Souza', 'beatriz.souza@empresa-lab.com', '(11) 96655-4433', 'Analista de Compras', 5200.00, '222.333.444-55', 'Apaixonada por logística', 'aluno', NULL),
            (s, 5, 'Roberto Alves', 'roberto.alves@empresa-lab.com', '(11) 95544-3322', 'Sócio-Diretor', 42000.00, '333.444.555-66', 'Fundador da empresa', 'aluno', NULL)
        ON CONFLICT (sala, numero) DO NOTHING;

        INSERT INTO idor_comprovantes (sala, numero, perfil_numero, valor, descricao) VALUES
            (s, 1001, 1, 1800.00, 'Pagamento de bolsa-auxílio mensal'),
            (s, 1002, 2, 4750.00, 'Pagamento de comissão sobre vendas do trimestre')
        ON CONFLICT (sala, numero) DO NOTHING;

        INSERT INTO idor_faturas (sala, numero, perfil_numero, valor, descricao) VALUES
            (s, 2001, 1, 49.90, 'Assinatura Mensal Básica'),
            (s, 2002, 4, 899.90, 'Assinatura Anual Premium')
        ON CONFLICT (sala, numero) DO NOTHING;

        INSERT INTO idor_pedidos (sala, numero, perfil_numero, item, valor) VALUES
            (s, 3001, 1, 'Curso Online de Introdução à Cibersegurança', 197.00),
            (s, 3002, 5, 'Backup Completo do Banco de Dados Pessoal', 1200.00)
        ON CONFLICT (sala, numero) DO NOTHING;

        INSERT INTO idor_chamados (sala, numero, perfil_numero, assunto, mensagem) VALUES
            (s, 4001, 1, 'Dúvida sobre meu boleto', 'Olá, gostaria de saber o vencimento do meu boleto deste mês.'),
            (s, 4002, 2, 'Esqueci minha senha de administrador, me ajudem urgente', 'Pessoal, preciso redefinir a senha mestre do sistema financeiro hoje ainda, é urgente.')
        ON CONFLICT (sala, numero) DO NOTHING;

        INSERT INTO idor_mensagens (sala, numero, perfil_numero, conteudo) VALUES
            (s, 5001, 1, 'Olá! Este é o seu canal privado com o suporte. Em que podemos ajudar?'),
            (s, 5002, 3, 'Carlos, segue seu código de recuperação de acesso: 884215. Não compartilhe com ninguém.')
        ON CONFLICT (sala, numero) DO NOTHING;

    END LOOP;
END $$;
