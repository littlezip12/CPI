from pathlib import Path
p=Path(__file__).resolve().parents[1]/'index.html'
t=p.read_text();
css='  <link rel=\"stylesheet\" href=\"css/homepage.css\">';js='  <script src=\"js/homepage-loader.js\"></script>'
if 'homepage.css' not in t:t=t.replace('</head>',css+'\n</head>')
if 'homepage-loader.js' not in t:t=t.replace('</body>',js+'\n</body>')
p.write_text(t)
print('Updated index.html')