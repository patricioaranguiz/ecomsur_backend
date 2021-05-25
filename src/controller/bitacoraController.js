const {jwtSign, jwtVerify} = require('../utils/jwtUtils')
const Excel = require('exceljs');
const base64 = require('file-base64');
const Logs = require('../models/logs');
const fs = require('fs');
const moment = require('moment-timezone');

exports.getLogs = async function(req, res){
    try {
        await jwtVerify(req.headers.authorization);
        const logs = await Logs.findAll({order: [['date', 'DESC']]});
        return res.status(200).json(logs)
    } catch (e) {
        res.status(500).send('wrong');
    }

}

exports.getReport = async function(req, res) {
    try {
        await jwtVerify(req.headers.authorization);
        const thin = {style: 'thin'};
        let workbook = new Excel.Workbook();
        let sheet = workbook.addWorksheet('Registros', {views: [{showGridLines: false}]});
        const array = [
            {'header': 'Fecha', 'key': 'fecha', 'width': '20'},
            {'header': 'Usuario', 'key': 'username', 'width': '15'},
            {'header': 'Detalle', 'key': 'detalle', 'width': '40'},
        ];
        var row = sheet.getRow(2);
        var init = 2;
        array.map((item, index) => {
            row.getCell(init).value = item.header;
            row.getCell(init).font = {bold: true, color: {argb: 'FFFFFFFF'}};
            row.getCell(init).fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF8cc63f'}};
            row.getCell(init).border = {top: thin, left: thin, bottom: thin, right: thin};
            sheet.getColumn(init).key = item.key;
            sheet.getColumn(init).width = item.width;
            init += 1;
        });
        const logs = await Logs.findAll({order: [['date', 'DESC']]});
        logs.map(part => {
            sheet.addRow({
                fecha: moment.tz(part.fecha, "America/Santiago").format('DD/MM/YYYY HH:mm:ss'),
                username: part.username,
                detalle: part.detalle
            })
        });
        workbook.xlsx.writeFile('test.xlsx').then(function () {
            base64.encode('test.xlsx', function (err, base64String) {
                if (err) {
                    console.log(err);
                }
                fs.unlinkSync('test.xlsx');
                res.status(200).json(base64String)
            });
        });
    } catch (e) {
        console.log(e)
        res.status(500).json(e)
    }
}
