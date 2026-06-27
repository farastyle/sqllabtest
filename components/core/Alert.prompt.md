Left-border info panel — the primary instructional UI pattern across all security lab pages. Used for how-to instructions, payload hints, warnings about destructive actions, and lab context.

```jsx
<Alert variant="sqli" title="📚 Bem-vindo ao Laboratório!">
  Este laboratório permite explorar SQL Injection em ambiente controlado.
</Alert>

<Alert variant="warning" title="⚠️ Atenção">
  Este teste altera os dados do banco para TODOS os alunos. Apertar o botão de Reset após testar.
</Alert>

<Alert variant="danger" title="💥 Banco de Dados Quebrou!">
  Erro de sintaxe SQL — pode ser que o payload funcionou!
</Alert>

<Alert variant="info" title="💡 Payloads para Testar:">
  Cole o payload no campo de busca e clique em Buscar.
</Alert>
```

Variants: `info` (blue), `success` (green), `warning` (yellow), `danger` (red/pink), `sqli` (purple), `xss` (green), `idor` (orange).
