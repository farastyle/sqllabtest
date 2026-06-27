Monospace code/payload display block. Used for SQL injection payloads, executed queries, and error output in the security labs.

```jsx
<CodeBlock label="Payload:">
  ' UNION SELECT id, email || ':' || senha, 0, false FROM usuarios--
</CodeBlock>

<CodeBlock label="Query executada:" variant="danger">
  SELECT * FROM produtos WHERE nome LIKE '%{payload}%' AND oculto = false
</CodeBlock>

<CodeBlock variant="neutral">
  ' OR '1'='1
</CodeBlock>
```

Notable props:
- `label`: small bold label above the block (e.g. "Payload:", "Query que causou o erro:")
- `variant`: controls border accent color — `info` (blue, default), `success`, `warning`, `danger`, `neutral`
