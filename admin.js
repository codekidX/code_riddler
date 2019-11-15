const express = require('express');
const path = require('path');
const app = express();


app.set('view engine', 'ejs');
app.use('/static', express.static(path.join(__dirname, 'static')));

app.listen(3001, () => {
    console.log('Admin server started');
})

app.get('/', (req, res) => {
    res.render('admin/index.ejs', {
        title: 'Admin | Code Riddler',
        stylesPath: './'
    });
})