const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, '../public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Etapa 1: Rotas estáticas para as páginas raspadas
app.get('/', (req, res) => {
  res.render('pages/home');
});

app.get('/collections/all', (req, res) => {
  res.render('pages/collection');
});

app.get('/products/:slug', (req, res) => {
  res.render('pages/product');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Servidor de visualização rodando na porta ' + PORT);
});
