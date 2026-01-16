const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const xmlFile = path.join(__dirname, 'formSubmission.xml');

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSubmission(body) {
  const FullName = escapeXml(body.FullName);
  const Age = escapeXml(body.Age);
  const Address = escapeXml(body.address || '');
  const FavoriteSubjects = escapeXml(body.FSubjects || '');
  const Password = escapeXml(body.password || '');
  const Gender = escapeXml(body.gender || '');
  let hobbies = body.hobbies || [];
  if (!Array.isArray(hobbies)) hobbies = [hobbies];

  const id = Date.now();
  const timestamp = new Date().toISOString();

  const lines = [];
  lines.push(`  <submission id="${id}" timestamp="${timestamp}">`);
  lines.push(`    <FullName>${FullName}</FullName>`);
  lines.push(`    <Age>${Age}</Age>`);
  lines.push(`    <Address>${Address}</Address>`);
  lines.push(`    <FavoriteSubjects>${FavoriteSubjects}</FavoriteSubjects>`);
  lines.push(`    <Password>${Password}</Password>`);
  lines.push(`    <Gender>${Gender}</Gender>`);
  lines.push(`    <Hobbies>`);
  hobbies.forEach(h => lines.push(`      <hobby>${escapeXml(h)}</hobby>`));
  lines.push(`    </Hobbies>`);
  lines.push(`  </submission>`);
  return lines.join('\n') + '\n';
}

app.use(express.static(path.join(__dirname)));

app.post('/submit_form', (req, res) => {
  const entry = buildSubmission(req.body);

  fs.readFile(xmlFile, 'utf8', (err, data) => {
    if (err) {
      // If file doesn't exist or unreadable, create a new root with this entry
      const content = `<?xml version="1.0" encoding="UTF-8"?>\n<formSubmissions>\n${entry}</formSubmissions>\n`;
      fs.writeFile(xmlFile, content, 'utf8', writeErr => {
        if (writeErr) {
          console.error('Write error:', writeErr);
          return res.status(500).send('Server error saving submission');
        }
        return res.redirect('/success.html');
      });
      return;
    }

    const closing = '</formSubmissions>';
    const idx = data.lastIndexOf(closing);
    if (idx !== -1) {
      const newData = data.slice(0, idx) + entry + data.slice(idx);
      fs.writeFile(xmlFile, newData, 'utf8', writeErr => {
        if (writeErr) {
          console.error('Write error:', writeErr);
          return res.status(500).send('Server error saving submission');
        }
        return res.redirect('/success.html');
      });
    } else {
      // No expected root tag — replace file with a proper root
      const content = `<?xml version="1.0" encoding="UTF-8"?>\n<formSubmissions>\n${entry}</formSubmissions>\n`;
      fs.writeFile(xmlFile, content, 'utf8', writeErr => {
        if (writeErr) {
          console.error('Write error:', writeErr);
          return res.status(500).send('Server error saving submission');
        }
        return res.redirect('/success.html');
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening: http://localhost:${PORT}`));
