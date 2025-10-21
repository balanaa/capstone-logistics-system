// Create Packing List examples Excel using xlsx
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
		['productDescription','','','','','','string','Item description text','table-left'],
		['productQuantity','','','','','','integer','Packaging-specific quantity column; prefer Carton > Case/Box > generic','table-middle (quantity column)'],
		['productNetWeight','','','','','','decimal (KGS)','Always the smaller of the two adjacent weight columns when unlabeled','table-right (weight column)'],
		['productGrossWeight','','','','','','decimal (KGS)','Always the larger of the two adjacent weight columns when unlabeled','table-right (weight column)'],
		['totalQuantity','','','','','','integer','Unlabeled total directly below the quantity column','bottom of quantity column'],
		['totalNetWeight','','','','','','decimal (KGS)','Total of net weight; if unlabeled, choose the smaller total vs gross','bottom of weight columns'],
		['totalGrossWeight','','','','','','decimal (KGS)','Total of gross weight; if unlabeled, choose the larger total vs net','bottom of weight columns'],
	];

	const wb = xlsx.utils.book_new();
	const ws = xlsx.utils.aoa_to_sheet(rows);
	xlsx.utils.book_append_sheet(wb, ws, 'Packing Examples');
	return wb;
}

(function main(){
	const outDir = path.join('docs','specs');
	ensureDirSync(outDir);
	const outPath = path.join(outDir, 'packing-list-examples.xlsx');

	const xlsx = require('xlsx');
	const wb = createWorkbook();
	xlsx.writeFile(wb, outPath);
	console.log(`Wrote ${outPath}`);
})();
