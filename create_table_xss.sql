-- Script de criação da tabela do Laboratório de XSS
-- Mural de comentários: usado tanto para o XSS Refletido (busca) quanto para o XSS Armazenado (mural)
-- A coluna "sala" isola o mural em duas turmas/salas (Lab 1 e Lab 2): o que um aluno
-- posta na sala 1 não aparece para quem está testando na sala 2, e vice-versa.

CREATE TABLE IF NOT EXISTS mural_comentarios (
    id SERIAL PRIMARY KEY,
    autor VARCHAR(100) NOT NULL,
    mensagem TEXT NOT NULL,
    sala VARCHAR(10) NOT NULL DEFAULT '1',
    criado_em TIMESTAMP DEFAULT NOW()
);

-- Alguns comentários de exemplo para cada sala já nascer com conteúdo
INSERT INTO mural_comentarios (autor, mensagem, sala) VALUES
    ('Professor', 'Bem-vindo ao Mural do Laboratório! Use os payloads da barra lateral para testar o XSS Armazenado aqui. 🔬', '1'),
    ('Aluno Teste', 'Esse curso está muito bom, aprendendo bastante sobre segurança!', '1'),
    ('Professor', 'Bem-vindo ao Mural do Laboratório! Use os payloads da barra lateral para testar o XSS Armazenado aqui. 🔬', '2'),
    ('Aluno Teste', 'Esse curso está muito bom, aprendendo bastante sobre segurança!', '2');
