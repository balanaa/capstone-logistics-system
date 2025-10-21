// Create Commercial Invoice examples Excel using xlsx
const fs = require('fs');
const path = require('path');

function ensureDirSync(dirPath) {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	}
}

function createWorkbook() {
	const xlsx = require('xlsx');

	const rows = [
		['CanonicalName','Example1','Example2','Example3','Example4','Example5','Structure','Notes','Location'],
		['invoiceNo','','','','','','string','Invoice No. variants; may appear near page title','top-left'],
		['invoiceDate','','','','','','date string','Sometimes combined with invoiceNo','top-left'],
		['incoterms','','','','','','string','Terms/Incoterms text (e.g., FOB, CIF)','top-right'],
		['productDescription','','','','','','string or multiline','Item description text','table-left'],
		['productQuantity','','','','','','number','Choose packaging-specific quantity (prefer Carton > Box/Case > generic Qty)','table-middle (quantity column)'],
		['unitPrice','','','','','','number','Unit price per item','table-right (unit price column)'],
		['productAmount','','','','','','number','Line total/amount/value per item','table-right (amount/total column)'],
		['totalQuantity','','','','','','number','Unlabeled total directly below the quantity column','bottom of quantity column'],
		['totalAmount','','','','','','number','Unlabeled total directly below the amount/total column','bottom of amount column'],
	];

	const wb = xlsx.utils.book_new();
	const ws = xlsx.utils.aoa_to_sheet(rows);
	xlsx.utils.book_append_sheet(wb, ws, 'Invoice Examples');
	return wb;
}

(function main(){
	const outDir = path.join('docs','specs');
	ensureDirSync(outDir);
	const outPath = path.join(outDir, 'invoice-examples.xlsx');

	const xlsx = require('xlsx');
	const wb = createWorkbook();
	xlsx.writeFile(wb, outPath);
	console.log(`Wrote ${outPath}`);
})();
