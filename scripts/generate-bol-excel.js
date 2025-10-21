// Create BoL examples Excel using xlsx
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
		['BLnumber','','','','','','string','B/L Number variants; keep punctuation as-is','top-right'],
		['shipper','','','','','','string or multiline','Company or name; may include address lines','top-left'],
		['consignee','','','','','','string or multiline','Company or name; may include address lines','top-left'],
		['vesselName','','','','','','string','May be combined with voyageNo','top-middle'],
		['voyageNo','','','','','','string','Often near vesselName; may be combined','top-middle'],
		['portOfLoading','','','','','','string','Port name as printed','top-middle'],
		['portOfDischarge','','','','','','string','Port name as printed','top-middle'],
		['placeOfDelivery','','','','','','string','Final delivery location','top-middle'],
		['containerNo','','','','','','string','ISO 6346 preferred; allow noisy OCR','table-left'],
		['sealNo','','','','','','string','May be alphanumeric; sometimes multiple','table-left'],
		['marksAndNumbers','','','','','','multiline','Free-form; preserve line breaks','table-left'],
		['noOfPackages','','','','','','integer','Leading count; may appear with kind text','table-middle'],
		['kindsOfPackage','','','','','','string','Normalized kind values if desired','table-middle'],
		['descriptionOfGoods','','','','','','multiline','May include "Said To Contain"; HS code inside','table-middle'],
		['hsCode','','','','','','string','6 or 8 digits canonical; store original too (may include separators in source)','table-middle'],
		['grossWeight','','','','','','number (KGS)','Capture KGS only; ignore LBS','table-right'],
	];

	const wb = xlsx.utils.book_new();
	const ws = xlsx.utils.aoa_to_sheet(rows);
	xlsx.utils.book_append_sheet(wb, ws, 'BoL Examples');
	return wb;
}

(function main(){
	const outDir = path.join('docs','specs');
	ensureDirSync(outDir);
	const outPath = path.join(outDir, 'bill-of-lading-examples.xlsx');

	const xlsx = require('xlsx');
	const wb = createWorkbook();
	xlsx.writeFile(wb, outPath);
	console.log(`Wrote ${outPath}`);
})();

