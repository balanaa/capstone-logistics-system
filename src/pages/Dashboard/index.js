import ShipmentPieChart from "../../components/PieCharts/ShipmentPieChart";
import TruckingPieChart from "../../components/PieCharts/TruckingPieChart";
import FinancePieChart from "../../components/PieCharts/FinancePieChart";
import TableComponent from "../../components/Tables/TableComponent";

function Dashboard() {
    return (
        <div className="container">
            <h2>Dashboard Overview</h2>
            <ShipmentPieChart />
            <TruckingPieChart />
            <FinancePieChart />
            <div>
            <TableComponent title="Bill of Lading" endpoint="billoflading" />
            <TableComponent title="Invoice" endpoint="invoice" />
            <TableComponent title="Packing List" endpoint="packinglist" />
            <TableComponent title="Delivery Order" endpoint="deliveryorder" />
            <TableComponent title="ImporterAdvice" endpoint="importeradvice" />
            <TableComponent title="Equipment Interchange" endpoint="equipmentinterchange" />
            <TableComponent title="Billing Invoices" endpoint="billinginvoices" />
            </div>
        </div>
    );
}

export default Dashboard;


