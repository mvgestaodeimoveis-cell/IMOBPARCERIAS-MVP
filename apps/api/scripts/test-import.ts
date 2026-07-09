import { extrairDeHtml } from '../src/lib/importer';

const html = `<!doctype html><html><head>
<title>Apartamento à venda - Pituba</title>
<meta property="og:title" content="Apartamento à venda, 3 quartos - Pituba, Salvador" />
<meta property="og:description" content="Lindo apartamento com 78 m², 3 quartos, 1 suíte, 2 vagas de garagem. Oportunidade!" />
<meta property="og:image" content="https://example.com/foto1.jpg" />
<meta property="og:image" content="https://example.com/foto2.jpg" />
<meta property="product:price:amount" content="450000" />
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product","name":"Apartamento Pituba",
"description":"3 quartos, 1 suíte","image":["https://example.com/foto1.jpg","https://example.com/foto3.jpg"],
"offers":{"@type":"Offer","price":"450000","priceCurrency":"BRL"},
"address":{"@type":"PostalAddress","streetAddress":"Rua das Flores, 100","addressLocality":"Salvador","postalCode":"41810-000"}}
</script>
</head><body>Imóvel à venda 78 m² 3 quartos 2 vagas 2 banheiros CEP 41810-000</body></html>`;

console.log(JSON.stringify(extrairDeHtml(html, 'https://portal.exemplo.com/imovel/123'), null, 2));
