import { createContext, useContext, useState } from "react";

const SalesContext = createContext(null);

// Dummy sales data
const initialSalesData = [
  {
    id: 1,
    salesPersonName: "Anchal Kumar",
    salesPersonId: 2,
    branch: "Delhi",
    companyName: "Tech Solutions Pvt Ltd",
    contactPerson: "Vikram Mehta",
    contactNumber: "9876543210",
    contactEmail: "vikram@techsolutions.com",
    date: "2026-01-28",
    designation: "HR Manager",
    requirement: "Relocation",
    location: "Mumbai",
    remark: "Interested in employee relocation services for 50 employees",
    nextFollowUpDate: "2026-02-05",
    queryStatus: "Hot",
  },
  {
    id: 2,
    salesPersonName: "Manoj Kumar",
    salesPersonId: 3,
    branch: "Mumbai",
    companyName: "Global Enterprises",
    contactPerson: "Anita Roy",
    contactNumber: "9123456789",
    contactEmail: "anita@globalent.com",
    date: "2026-01-29",
    designation: "CEO",
    requirement: "HR",
    location: "Delhi",
    remark: "Looking for HR management solutions",
    nextFollowUpDate: "2026-02-06",
    queryStatus: "Warm",
  },
  {
    id: 3,
    salesPersonName: "Varun Arora",
    salesPersonId: 4,
    branch: "Delhi",
    companyName: "StartUp Hub",
    contactPerson: "Karan Singh",
    contactNumber: "9988776655",
    contactEmail: "karan@startuphub.io",
    date: "2026-01-30",
    designation: "Founder",
    requirement: "Real Estate",
    location: "Bangalore",
    remark: "Need office space for 100 employees",
    nextFollowUpDate: "2026-02-03",
    queryStatus: "Hot",
  },
  {
    id: 4,
    salesPersonName: "Sushil Kumar",
    salesPersonId: 5,
    branch: "Bangalore",
    companyName: "Finance Corp",
    contactPerson: "Rajesh Kumar",
    contactNumber: "9876512345",
    contactEmail: "rajesh@financecorp.com",
    date: "2026-01-31",
    designation: "CFO",
    requirement: "Relocation",
    location: "Hyderabad",
    remark: "Bulk relocation for new office",
    nextFollowUpDate: "2026-02-07",
    queryStatus: "Cold",
  },
  {
    id: 5,
    salesPersonName: "Anchal Kumar",
    salesPersonId: 2,
    branch: "Delhi",
    companyName: "Digital Dreams",
    contactPerson: "Pooja Verma",
    contactNumber: "9654321098",
    contactEmail: "pooja@digitaldreams.com",
    date: "2026-02-01",
    designation: "Operations Head",
    requirement: "HR",
    location: "Pune",
    remark: "HR outsourcing inquiry",
    nextFollowUpDate: "2026-02-08",
    queryStatus: "Warm",
  },
  {
    id: 6,
    salesPersonName: "Varun Arora",
    salesPersonId: 4,
    branch: "Delhi",
    companyName: "Creative Agency",
    contactPerson: "Sanjay Nair",
    contactNumber: "9012345678",
    contactEmail: "sanjay@creativeagency.in",
    date: "2026-02-02",
    designation: "Director",
    requirement: "Real Estate",
    location: "Chennai",
    remark: "Looking for commercial property",
    nextFollowUpDate: "2026-02-10",
    queryStatus: "Closed",
  },
  {
    id: 7,
    salesPersonName: "Manoj Kumar",
    salesPersonId: 3,
    branch: "Mumbai",
    companyName: "Healthcare Plus",
    contactPerson: "Dr. Meera Shah",
    contactNumber: "9876509876",
    contactEmail: "meera@healthcareplus.com",
    date: "2026-02-02",
    designation: "Medical Director",
    requirement: "Relocation",
    location: "Ahmedabad",
    remark: "Staff relocation for new hospital wing",
    nextFollowUpDate: "2026-02-09",
    queryStatus: "Hot",
  },
  {
    id: 8,
    salesPersonName: "Sushil Kumar",
    salesPersonId: 5,
    branch: "Bangalore",
    companyName: "EduTech Solutions",
    contactPerson: "Vivek Sharma",
    contactNumber: "9988112233",
    contactEmail: "vivek@edutech.com",
    date: "2026-02-03",
    designation: "CTO",
    requirement: "HR",
    location: "Noida",
    remark: "Need HR management for 200+ employees",
    nextFollowUpDate: "2026-02-12",
    queryStatus: "Warm",
  },
];

export const SalesProvider = ({ children }) => {
  const [salesEntries, setSalesEntries] = useState(initialSalesData);

  const addSalesEntry = (entry) => {
    const newEntry = {
      ...entry,
      id: Date.now(),
      date: new Date().toISOString().split("T")[0],
    };
    setSalesEntries([newEntry, ...salesEntries]);
    return newEntry;
  };

  const updateSalesEntry = (id, updatedData) => {
    setSalesEntries((prevEntries) => {
      const updatedEntry = { ...prevEntries.find((e) => e.id === id), ...updatedData, lastUpdated: new Date().toISOString().split("T")[0] };
      const otherEntries = prevEntries.filter((e) => e.id !== id);
      return [updatedEntry, ...otherEntries];
    });
  };

  const getEntryById = (id) => {
    return salesEntries.find((entry) => entry.id === id);
  };

  const getSalesEntriesByUser = (userId) => {
    return salesEntries.filter((entry) => entry.salesPersonId === userId);
  };

  const getAllSalesEntries = () => {
    return salesEntries;
  };

  const getStats = () => {
    const total = salesEntries.length;
    const hot = salesEntries.filter((e) => e.queryStatus === "Hot").length;
    const warm = salesEntries.filter((e) => e.queryStatus === "Warm").length;
    const cold = salesEntries.filter((e) => e.queryStatus === "Cold").length;
    const closed = salesEntries.filter(
      (e) => e.queryStatus === "Closed",
    ).length;

    const byBranch = {
      "Branch A": salesEntries.filter((e) => e.branch === "Branch A").length,
      "Branch B": salesEntries.filter((e) => e.branch === "Branch B").length,
    };

    const byRequirement = {
      Relocation: salesEntries.filter((e) => e.requirement === "Relocation")
        .length,
      HR: salesEntries.filter((e) => e.requirement === "HR").length,
      "Real Estate": salesEntries.filter((e) => e.requirement === "Real Estate")
        .length,
    };

    const bySalesPerson = salesEntries.reduce((acc, entry) => {
      acc[entry.salesPersonName] = (acc[entry.salesPersonName] || 0) + 1;
      return acc;
    }, {});

    return {
      total,
      hot,
      warm,
      cold,
      closed,
      byBranch,
      byRequirement,
      bySalesPerson,
    };
  };

  return (
    <SalesContext.Provider
      value={{
        salesEntries,
        addSalesEntry,
        updateSalesEntry,
        getEntryById,
        getSalesEntriesByUser,
        getAllSalesEntries,
        getStats,
      }}
    >
      {children}
    </SalesContext.Provider>
  );
};

export const useSales = () => {
  const context = useContext(SalesContext);
  if (!context) {
    throw new Error("useSales must be used within a SalesProvider");
  }
  return context;
};
