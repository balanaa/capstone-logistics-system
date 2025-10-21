// Read docs/specs/bill-of-lading-examples.xlsx and print JSON rows
const path = require('path');
const fs = require('fs');

(function main(){
	const xlsx = require('xlsx');
	const filePath = path.join('docs','specs','bill-of-lading-examples.xlsx');
	if (!fs.existsSync(filePath)) {
		console.error(`File not found: ${filePath}`);
		process.exit(1);
	}
	const wb = xlsx.readFile(filePath);
	const sheetName = wb.SheetNames[0];
	const ws = wb.Sheets[sheetName];
	const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
	console.log(JSON.stringify(rows, null, 2));
})();
