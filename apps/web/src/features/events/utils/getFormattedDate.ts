/**
 * Pure function, `getFormattedDate(dateString) → "1st January"`-style
 * string. No timezone handling — relies on `new Date(dateString)`'s
 * local-timezone interpretation. Only consumer is `EventsMarqueeCards.tsx`
 * (itself unused) — see SPEC.md.
 */
const getFormattedDate = (dateString?: string): string => {
  const date = new Date(dateString ?? "");
  const day = date.getDate();
  const monthIndex = date.getMonth();

  // Function to get the ordinal suffix for the day
  const getOrdinalSuffix = (day: number): string => {
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
