Action button used for login, search, reset, navigation and payload execution throughout the security labs.

```jsx
<Button variant="primary">🚀 Entrar no Laboratório</Button>
<Button variant="success">🔍 Buscar</Button>
<Button variant="danger">🗑️ Deletar</Button>
<Button variant="warning" fullWidth>🔄 Resetar Dados do Laboratório</Button>
<Button variant="secondary">Voltar</Button>
<Button variant="ghost">← Voltar para o Login</Button>
<Button disabled>Indisponível</Button>
```

Notable variants/props:
- `variant`: `primary` (purple gradient, brand default), `success` (green), `danger` (red), `warning` (orange), `info` (blue), `secondary` (gray outlined), `ghost` (transparent outlined)
- `size`: `sm` / `md` / `lg`
- `fullWidth`: 100% width — used for sidebar reset/logout buttons
- `disabled`: muted, no cursor
