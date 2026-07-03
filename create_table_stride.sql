-- Lab STRIDE: Modelagem de Ameaças
-- Rastreia quais exercícios cada sala concluiu (progressão server-side apenas)
CREATE TABLE IF NOT EXISTS stride_progresso (
    sala        VARCHAR(10)  NOT NULL,
    teste_id    VARCHAR(20)  NOT NULL,
    concluido_em TIMESTAMP   DEFAULT NOW(),
    PRIMARY KEY (sala, teste_id)
);
