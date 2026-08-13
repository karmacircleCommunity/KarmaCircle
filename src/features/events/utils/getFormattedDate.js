const getFormattedDate = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDate();
  const monthIndex = date.getMonth();

  // Define an array with month names

  // Function to get the ordinal suffix for the day
  const getOrdinalSuffix = (day) => {
    if (day >= 11 && day <= 13) {
      return "th";
    }
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  // Example usage

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Construct the formatted date string
  const formattedDate = `${day}${getOrdinalSuffix(day)} ${
    monthNames[monthIndex]
  }`;

  return formattedDate;
};

export default getFormattedDate;
