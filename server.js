const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const {Document, Packer, Paragraph} = require('docx');

const detectnewline = import('detect-newline');

const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 3001;


// app.use(express.json())

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('OCR Web App Backend Running');
});

app.post('/convert-to-pdf', (req, res) => {
    console.log(req.body)
    const { text } = req.body;

    if (!text) {
        return res.status(400).send('Text is required');
    }

    const doc = new PDFDocument();
    const fileName = 'output.pdf';
    const filePath = path.join(__dirname, fileName);

    doc.pipe(fs.createWriteStream(filePath));
    doc.text(text);
    doc.end();

    doc.on('finish', () => {
        res.download(filePath, fileName, (err) => {
            if (err) {
                res.status(500).send('Error downloading the file');
            } else {
                // fs.unlinkSync(filePath); // delete the file after download
            }
        });
    });
});


app.post('/upload', upload.single('image'), (req, res) => {
    const imagePath = req.file.path;

    Tesseract.recognize(imagePath, 'eng', { logger: m => console.log(m) })
        .then(({ data: { text } }) => {
            const doc = new PDFDocument();
            const fileName = 'output.pdf';
            const filePath = path.join(__dirname, fileName);

            doc.pipe(fs.createWriteStream(filePath));
            doc.text(text);
            doc.end();

            doc.on('finish', () => {
                res.download(filePath, fileName, (err) => {
                    if (err) {
                        res.status(500).send('Error downloading the file');
                    } else {
                        fs.unlinkSync(filePath); // delete the file after download
                        fs.unlinkSync(imagePath); // delete the uploaded image
                    }
                });
            });
        })
        .catch(err => {
            res.status(500).send('Error processing image');
            fs.unlinkSync(imagePath); // delete the uploaded image
        });
});


app.get('/process-folder', (req, res) => {
    const folderPath = path.join(__dirname, 'images'); // folder containing images
    const outputFolder = path.join(__dirname, 'output'); // folder to save PDF files
    const docxFolder = path.join(__dirname, 'docx_windows'); // folder to save PDF files

    const { limit } = req.query

    async function createDocxFromText(text, imageFileName) {
    
        // Split text into paragraphs (assuming each line is a paragraph)
        var presection = []
        const paragraphs = text.split(/\r?\n/);
        paragraphs.forEach((val) => {
            presection.push([new Paragraph({
                text: val
            })])
        })

        const doc = new Document({creator: 'Un-named', sections: [
            {children: presection}
        ]});
        // Add each paragraph to the document
        // paragraphs.forEach(paragraph => {
        //     doc.addParagraph(new Paragraph(paragraph));
        // });

        const outputFileName = `${path.parse(imageFileName).name}.docx`;
        const outputPath = path.join(docxFolder, outputFileName);
    
        // Save the document
        // const buffer = Buffer.from(doc.serialize(), 'utf16le')
        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(outputPath, buffer);

        return outputPath

    }

    // Create output folder if it doesn't exist
    if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder);
    }

    const files = fs.readdirSync(folderPath).filter(file => /\.(jpg|jpeg|png|gif|bmp)$/i.test(file));

    if (files.length === 0) {
        return res.status(400).send('No image files found in the folder');
    }

    var textAll = ''

    const processImage = (filePath, callback) => {
        Tesseract.recognize(filePath, 'eng', {})
            .then(async ({ data: { text } }) => {
                // text.replace(/([^\n])\n([^\n])/g, '$1 $2')
                // const lines = text.split(/\r?\n/);

                // Output each line
                // lines.forEach(line => {
                //     console.log(line);
                // });
                newText = text.replace(/([^\n])\n([^\n])/g, '$1 $2')

                fs.writeFileSync(path.join(__dirname, 'var'), newText, { flag: 'a+' });

                // callback(null, 'pdfPath', 'fileName')

                // const fileName = createDocxFromText(text, filePath)

                // callback(null, filePath, fileName);

                // console.log(newText)
                const fileName = path.basename(filePath, path.extname(filePath)) + '.pdf';
                const pdfPath = path.join(outputFolder, fileName);
                console.log(fileName);
                // const doc = new PDFDocument({size: "A4"});
                // doc.fontSize(12)
                // doc.font('Times-Roman')
                // var stream = doc.pipe(fs.createWriteStream(pdfPath));
                // doc.text(newText);
                // doc.end();

                callback(null, pdfPath, fileName);
                
                // stream.on('finish', () => {
                //     console.log(fileName)
                    // callback(null, pdfPath, fileName);
                // })

            })
            .catch(err => {
                callback(err);
            });
    };

    let index = 0;
    const results = [];
    // console.log(results)
    const lengthLimit = limit || files.length
    const processNext = () => {
        if (index < lengthLimit) {
            processImage(path.join(folderPath, files[index]), (err, pdfPath, fileName) => {
                if (err) {
                    console.log(err)
                    return res.status(500).send('Error processing image');
                }
                results.push({ pdfPath, fileName });
                index++;
                processNext();
            });
        } else {

            const fileName = 'output_.pdf';
            const pdfPath = path.join(__dirname, fileName);
            const doc = new PDFDocument({size: "A4"});
            doc.fontSize(12)
            doc.font('Times-Roman')
            var stream = doc.pipe(fs.createWriteStream(pdfPath));
            doc.text(textAll);
            doc.end();

            stream.on('finish', () => {
                res.json({ message: 'Processing complete', files: results.map(({ fileName }) => fileName) });
            })

        }
    };

    processNext();
});

app.get('/text-to-pdf', (req, res) => {

    const fileName = 'output__preview.pdf';
    const pdfPath = path.join(__dirname, fileName);
    const doc = new PDFDocument({size: "A4"});
    doc.fontSize(12)
    doc.font('Times-Roman')
    var stream = doc.pipe(fs.createWriteStream(pdfPath));
    const readFile = fs.readFileSync(path.join(__dirname, 'var'), 'utf-8')
    doc.text(readFile);
    doc.end();

    // console.log(readFile)

    stream.on('finish', () => {
        console.log('finished')
        res.json({ message: 'Processing complete' });
    })

})

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
