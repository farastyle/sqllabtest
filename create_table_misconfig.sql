-- Script de criação da tabela do Laboratório de Misconfiguration + Dados Sensíveis
-- Diferente do lab de IDOR, este lab não precisa de tabelas de conteúdo (nada é
-- editado/excluído pelo aluno) — todo o conteúdo "exposto" de cada exercício é
-- servido a partir de texto fixo no server.js, já divergente entre sala 1 e sala 2.
-- A única tabela necessária é a de progresso, usada pelo painel oculto do professor.

CREATE TABLE IF NOT EXISTS misconfig_progresso (
    sala VARCHAR(10) NOT NULL,
    teste_id VARCHAR(15) NOT NULL,
    concluido_em TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (sala, teste_id)
);
