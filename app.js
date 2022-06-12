const log = console.log.bind(console)
const express = require('express')
const fileUpload = require('express-fileupload')
const app = express()
const port = 3000
const path = require('path')
const servicesFolder = path.join(__dirname, 'services')
const GPXConverter = require(`${servicesFolder}/gpxconverter.js`)
const EventEmitter = require('events');
global.eventEmitter = new EventEmitter();
let fileProcessed = false;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
    useTempFiles : true,
    tempFileDir : '/tmp/',
    createParentPath: true,
    debug: true
}))
// app.post('*', (req, res, next) => {
//     req.body; // JavaScript object containing the parse JSON
//     res.json(req.body);
//     // console.log('req.body', req.body);
//     // console.log('res.json', res.json(req.body));
//     console.log('post *');
//     next()
// });

eventEmitter.on('processed', (result) => {
    console.log(result);
    fileProcessed = true
});

app.get('/', (req, res) => {
    console.log('fileProcessed app.get', fileProcessed);
    res.render('index', {
        title: 'Calimoto to TomTom Converter'
    });
})

app.post('/upload', async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0)
        return res.status(400).send('No files were uploaded.')

    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    const sampleFile = req.files.sampleFile;
    const multiple = Array.isArray(sampleFile);

    try {
        await checkFile(sampleFile, multiple)
        await moveFile(sampleFile, multiple)

        res.sendStatus(200)
    } catch (error) {
        res.status(500).send(error)
    }
})

function moveFile(uploadedFile, multiple = false) {
    return new Promise((resolve, reject) => {
        const uploadPath = `${__dirname}/gpxfiles/`

        if(multiple) {
            uploadedFile.forEach(f => {
                // Use the mv() method to place the file somewhere on your server
                f.mv(`${uploadPath}${f.name}`, err => {
                    if (err)
                        reject(err)
                })
            })
        }
        else {
            uploadedFile.mv(`${uploadPath}${uploadedFile.name}`, err => {
                if (err)
                    reject(err)
            })
        }

        resolve()
    })
}

function checkFile(uploadedFile, multiple = false) {
    return new Promise((resolve, reject) => {
        const err = 'No gpx files were uploaded.'

        if(multiple) {
            if(!uploadedFile.every(f => isGPXFile(f.name))) {
                reject(err)
            }
        }
        else if(!isGPXFile(uploadedFile.name)) {
            reject(err)
        }
        
        resolve()
    })
}

function isGPXFile(filePath) {
    return path.extname(filePath).toLowerCase() === '.gpx'
}

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
// --