import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello World! Backend TypeScript Express fonctionne.');
});

app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
