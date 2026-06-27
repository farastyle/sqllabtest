Lab selection card for the security training hub. Renders an emoji icon, colored title, and description. Use in a flex row for the 3-up hub grid.

```jsx
<div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
  <LabCard
    lab="sqli"
    title="SQL Injection"
    description="Login bypass, UNION SELECT, blind injection e mais 10 testes práticos."
    href="/sqli"
  />
  <LabCard
    lab="xss"
    title="Cross-Site Scripting (XSS)"
    description="XSS Refletido na busca e XSS Armazenado no mural de comentários."
    href="/xss"
  />
  <LabCard
    lab="idor"
    title="IDOR / Controle de Acesso"
    description="Manipulação de IDs, escalonamento de privilégio e 10 falhas de autorização."
    href="/idor"
  />
</div>
```

`lab` prop controls emoji + accent color:
- `sqli` → 💉 purple (`#667eea`)
- `xss`  → 🧪 green  (`#28a745`)
- `idor` → 🔓 orange (`#fd7e14`)
- `main` → 🔬 purple (hub/brand)
