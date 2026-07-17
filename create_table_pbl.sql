-- Lab PBL: Mapear Ameaças e Riscos (Aula 20)
CREATE TABLE IF NOT EXISTS pbl_respostas (
    aluno          VARCHAR(50)  NOT NULL,
    etapa          VARCHAR(20)  NOT NULL,
    respostas      JSONB        NOT NULL,
    entregue       BOOLEAN      DEFAULT FALSE,
    atualizado_em  TIMESTAMP    DEFAULT NOW(),
    PRIMARY KEY (aluno, etapa)
);
