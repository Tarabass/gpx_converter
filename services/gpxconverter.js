module.exports = function() {
    const chokidar = require('chokidar')
    const watcher = chokidar.watch('gpxfiles/**/*.gpx', {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
    })
    const path = require('path')
    const fs = require('fs')
    const xml2js = require('xml2js')
    const parseString = xml2js.parseString
    const builder = new xml2js.Builder()
    const GPXConverterModule = require(`${path.join(__dirname, '../modules')}/gpxconverter.js`)
    require('dotenv').config({path: './.env'})

    // Setup watchers for chokidar
    watcher
        .on('add', filePath => {
            console.log(`File ${filePath} has been added`)
            calimotoToTomTom(filePath).then(result => {
                console.log(result.message)
                eventEmitter.emit('processed', result.message);
            }).catch(err => {
                console.log(err);
                GPXConverterModule.addError(err)
                eventEmitter.emit('processed', err);
            })
        })
        .on('change', filePath => console.log(`File ${filePath} has been changed`))
        .on('unlink', filePath => console.log(`File ${filePath} has been removed`))

    // Remove files after upload
    setInterval(() => {
        const convertedFilesPath = process.env.CONVERTED_FOLDER
        const files = fs.readdirSync(convertedFilesPath)
        
        files.forEach(file => {
            const convertedFilePath = path.join(convertedFilesPath, file)

            fs.stat(convertedFilePath, (err, stats) => {
                if (err) {
                    console.error(err);
                }

                //3600000
                if (fileOlderThen(stats, parseInt(process.env.TTL_CONVERTED_FILES))) {
                    fs.unlink(convertedFilePath, (err) => {
                        if (err) throw err
                    })
                }
            });
        })
    }, 1000)

    function fileOlderThen(stats, timeInMilliSeconds) {
        const now = new Date().getTime()
        const endTime = new Date(stats.ctime).getTime() + timeInMilliSeconds

        return now > endTime
    }

    function calimotoToTomTom(filePath, route = true, track = false) {
        return new Promise((resolve, reject) => {
            try {
                const fileName = path.basename(filePath)
                const convertedFileName = `${fileName.substring(0, fileName.lastIndexOf('.'))}_converted.gpx`
                const convertedFolder = process.env.CONVERTED_FOLDER
                const convertedFilePath = `${convertedFolder}\\${convertedFileName}`
        
                // content = content.replace(/<metadata>[\s\S]*?<\/metadata>/m, '')
                // content = content.replace(/^.*<wpt[\s\S]*?\/>/gm, '')
                
                // if(!route)
                //     content = content.replace(/<rte>[\s\S]*?<\/rte>/m, '')

                // if(!track)
                //     content = content.replace(/<trk>[\s\S]*?<\/trk>/m, '')
                
                // fs.writeFileSync(convertedFileName, content)

                // if(filePath !== convertedFileName)
                //     fs.unlinkSync(filePath)

                const data = fs.readFileSync(filePath)

                parseString(data, (err, result) => {
                    if(result.gpx.$.creator !== 'https://calimoto.com') {
                        throw Error('Unknown GPX Creator')
                    }
                    
                    // Convert WapyPoints to RoutePoints and add type 'TT_HARD'
                    const rtept = []

                    result.gpx.wpt.forEach(element => {
                        rtept.push({ 
                            $: {
                                lat: element.$.lat,
                                lon: element.$.lon
                            },
                            type: 'TT_HARD'
                        })
                    });
                    // --

                    // Create object for xml2js and convert it to XML
                    const obj = {
                        gpx: {
                            $: {
                                xmlns: result.gpx.$.xmlns,
                                'xmlns:tt': 'TT',
                                version: result.gpx.$.version,
                                creator: 'TomTom MyDrive'
                            },
                            rte: {
                                name: result.gpx.metadata[0].desc[0],
                                rtept
                            }
                        }
                    }

                    if(track) {
                        result.gpx.trk[0].name[0] = `${result.gpx.metadata[0].desc[0]} track`
                        obj.gpx.trk = result.gpx.trk
                    }

                    content = builder.buildObject(obj)
                    // --

                    // Create folder (if not exists) and create file
                    if(!fs.existsSync(convertedFolder))
                        fs.mkdirSync(convertedFolder)
                    
                    fs.writeFileSync(convertedFilePath, content)
                    // --

                    // Delete uploaded file
                    fs.unlinkSync(filePath)
                    // --

                    resolve({ message: 'Done', convertedPath: convertedFilePath })
                })
            } catch (error) {
                // Delete uploaded file
                fs.unlinkSync(filePath)
                // --

                reject(error)
            }
        })
    }
}()
