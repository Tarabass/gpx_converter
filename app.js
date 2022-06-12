const log = console.log.bind(console)
const express = require('express')
const fileUpload = require('express-fileupload')
const app = express()
const port = 3000
const host = 'localhost'
const path = require('path')
const servicesFolder = path.join(__dirname, 'services')
const GPXConverter = require(`${servicesFolder}/gpxconverter.js`)
const EventEmitter = require('events');
global.eventEmitter = new EventEmitter();
const GPXConverterModule = require(`${path.join(__dirname, 'modules')}/gpxconverter.js`)
let fileProcessed = false;

const httpServer = app.listen(port, host, (err) => {
    if (err)
        console.log(err)
    
    console.log("Server listening on PORT", port)
})
// --

// Initializing socket.io object
const { Server } = require('socket.io')
const io = new Server(httpServer,{
    // Specifying CORS 
    cors: {
        origin: host,
    }
})

io.on('connection', (socket) => {
    console.log('a user connected');
});

const liveData = io.of('/liveData')

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
    // GPXConverterModule.addError('error 123')
    // console.log(process.env.CONVERTED_FOLDER)
    console.log('fileProcessed app.get', fileProcessed);
    const files = ['fsdfsf_converted.gpx']
    const errors = GPXConverterModule.getErrors()
    GPXConverterModule.clearErrors()

    res.render('index', {
        title: 'Calimoto to TomTom Converter',
        files,
        errors: errors
    })
})

app.post('/upload', async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0)
        return res.status(400).send('No files were uploaded.')

    // The name of the input field (i.e. "gpxfile") is used to retrieve the uploaded file
    const gpxFile = req.files.gpxfile
    const multiple = Array.isArray(gpxFile)

    try {
        await checkFile(gpxFile, multiple)
        await moveFile(gpxFile, multiple)

        const ival = setInterval(() => {
            console.log('fileProcessed', fileProcessed)
            if(fileProcessed) {
                console.log(GPXConverterModule.getErrors());
                console.log(`http://${host}:${port}/gpxfiles_converted/${gpxFile.name}`);

                if(GPXConverterModule.getErrors().length === 0)
                    liveData.emit('test-event', { url: `http://${host}:${port}/To MKCmoto_converted.gpx`, name: gpxFile.name })

                clearInterval(ival)
                // res.sendStatus(200)

                fileProcessed = false
                res.redirect(GPXConverterModule.getErrors().length > 0 ? 500 : 200, '/')
            }
        }, 100);

        console.log('upload success');
    } catch (error) {
        console.log('upload error');
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
