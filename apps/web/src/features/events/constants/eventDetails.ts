import type { EventDetail } from "../types";

/**
 * Detail-page content for every event in `eventDirectory.ts`, keyed by
 * `DirectoryEvent.id`.
 *
 * **None of this is fetched**, exactly like the directory itself -
 * `services/Events.ts`'s `getEvents()` is still the un-called real fetch
 * and there is no single-event endpoint at all yet (see
 * `docs/specs/events.md`). It lives in its own file rather than as fields
 * on `DirectoryEvent` because the grid needs none of it, and a real API
 * will almost certainly serve the list and one event from two endpoints:
 * keeping them apart means wiring the page up is one `useSWR` call landing
 * in one place.
 *
 * **Every directory event must have an entry here.** `findEventDetail`
 * returns `undefined` otherwise and the page falls back to its not-found
 * state, which for a real record in the grid would be a bug, not a 404.
 *
 * On cost: `cost` is omitted for every free event, which is nearly all of
 * them - these are nonprofit drives, so a price is the exception worth
 * spelling out rather than a field to fill with a zero. `bringAlong`
 * carries the "free, but bring your own boots" middle ground.
 */
export const eventDetails: Record<string, EventDetail> = {
  "night-kitchen-shift": {
    about: [
      "The night kitchen runs every evening from a rented unit behind Sealdah station: 400 hot meals cooked from 6pm, plated at 8:30, and walked out along the corridor from 9. Most of the people we serve are working - porters, rickshaw pullers, cleaners coming off a shift - and the round is timed around them, not around us.",
      "A winter shift is heavier than the rest of the year. We add a second serving point near the ticket counters, and we hand out blankets alongside the food while stock lasts. No cooking experience is needed; the two people running the pans have done this for six years and will put you where you are useful.",
    ],
    endsAt: "2026-09-13T00:30:00+05:30",
    agenda: [
      {
        time: "9:00 pm",
        title: "Arrive, sign in, quick brief",
        detail: "Aprons, gloves and a five-minute safety walkthrough.",
      },
      {
        time: "9:20 pm",
        title: "Plating and packing",
        detail: "Two lines: rice and dal, then the packing table.",
      },
      {
        time: "10:15 pm",
        title: "The corridor round",
        detail: "In pairs, from the station gate down to the flyover.",
      },
      {
        time: "12:00 am",
        title: "Wash down and close",
        detail: "Everything gets scrubbed. It goes faster than it sounds.",
      },
    ],
    bringAlong: [
      "Closed shoes - the floor gets wet by the second hour",
      "A water bottle you can refill",
      "Warm layers if you are joining the round outside",
    ],
    venue: {
      name: "Sunrise Community Kitchen",
      addressLines: ["Unit 4, Bibekananda Road", "Behind Sealdah South gate"],
      gettingThere:
        "Six minutes on foot from Sealdah station, south exit. Autos from Moulali drop at the corner; there is no parking on the lane itself.",
      mapQuery: "Bibekananda Road, Sealdah, Kolkata",
    },
    fundraiser: {
      purpose:
        "Rice, dal and gas for the winter round, plus 300 blankets to hand out alongside the food.",
      goal: 450000,
      raised: 288400,
      currency: "INR",
      supporters: 512,
    },
    languages: ["Bengali", "Hindi", "English"],
    minimumAge: 16,
    contactEmail: "shifts@sunriseyouthclub.org",
  },

  "library-shelving-weekend": {
    about: [
      "The old library lost its roof in the March storms and everything in it went into storage. The rebuild is finished; the shelves are not. This is two days of flat-pack carpentry, sanding, and getting 1,200 donated books out of boxes and into an order a child can actually use.",
      "Saturday is build day and Sunday is sorting day. You can come for either or both - people who have never held a drill are paired with people who have.",
    ],
    endsAt: "2026-09-20T16:00:00+03:00",
    agenda: [
      { time: "8:00 am", title: "Tea, teams and tool handout" },
      {
        time: "8:30 am",
        title: "Shelf assembly",
        detail: "Fourteen units, four people each.",
      },
      {
        time: "1:00 pm",
        title: "Lunch on site",
        detail: "Cooked by the parents' committee. Vegetarian by default.",
      },
      {
        time: "2:00 pm",
        title: "Sanding, fixing and the wall anchors",
      },
      {
        time: "Sunday, 9:00 am",
        title: "Unboxing and sorting",
        detail: "By age band first, then subject.",
      },
    ],
    bringAlong: [
      "Work gloves if you own a pair - we have some, not enough",
      "A cordless drill, clearly labelled, if you can spare one for the weekend",
      "Sun cover: the yard has no shade until midday",
    ],
    venue: {
      name: "Ubuntu Learning Trust library",
      addressLines: ["Plot 22, Namanga Road", "Ilbissil"],
      gettingThere:
        "Matatus from Kajiado town centre run every 20 minutes and stop at the school gate. There is space for eight cars inside the compound.",
      mapQuery: "Namanga Road, Ilbissil, Kajiado, Kenya",
    },
    fundraiser: {
      purpose:
        "Timber, anchors and a second reading table, plus transport for the books still in storage.",
      goal: 620000,
      raised: 214000,
      currency: "KES",
      supporters: 138,
    },
    languages: ["English", "Swahili", "Maa"],
    contactEmail: "library@ubuntulearning.org",
  },

  "monsoon-health-camp-ward-four": {
    about: [
      "Ward 4 floods every monsoon and the same three things follow the water: skin infections, diarrhoea in under-fives, and fever nobody gets checked until it is bad. The camp runs for one day in a school hall on the high ground, and last year it saw 900 people.",
      "We need clinicians, but we need translators and queue managers just as badly - a camp that runs out of either stops moving. If you are not medical, say so when you sign up and you will be put on registration or the ORS table.",
    ],
    endsAt: "2026-09-05T18:00:00+06:00",
    agenda: [
      { time: "9:00 am", title: "Set up: six desks, two screens, one queue" },
      {
        time: "10:00 am",
        title: "Camp opens",
        detail: "Registration, vitals, then consultation.",
      },
      {
        time: "1:30 pm",
        title: "Rolling lunch",
        detail: "The queue does not stop; the volunteers rotate.",
      },
      {
        time: "4:00 pm",
        title: "Kit distribution",
        detail: "ORS packs and mosquito nets, one per household.",
      },
      { time: "5:30 pm", title: "Pack down and referral handover" },
    ],
    bringAlong: [
      "Your registration or licence number if you are joining as a clinician",
      "A stethoscope if you carry one",
      "Shoes you do not mind soaking",
    ],
    venue: {
      name: "Ward 4 Government Primary School",
      addressLines: ["School Road, Mirpur 11", "Block C"],
      gettingThere:
        "Ten minutes from Mirpur 11 metro. Rickshaws know the school by name; the hall is the building behind the field.",
      mapQuery: "Mirpur 11, Dhaka, Bangladesh",
    },
    fundraiser: {
      purpose:
        "Medicines, 600 ORS kits and 400 treated mosquito nets for the households the camp reaches.",
      goal: 900000,
      raised: 767500,
      currency: "BDT",
      supporters: 1104,
    },
    languages: ["Bengali", "English"],
    minimumAge: 18,
    contactEmail: "camps@aarogyavolunteers.org",
  },

  "adoption-sunday": {
    about: [
      "Thirty animals, all vaccinated and dewormed, meeting people who might take them home. Nineteen cats and eleven dogs, most of them pulled off Pune's streets in the last four months, all of them already through the fostering that makes a first week at home survivable.",
      "Adopting is free and always will be. What we ask is an honest conversation first - our team will talk you through the animal's history, and no one goes home the same day without a home check being booked.",
    ],
    endsAt: "2026-09-27T16:30:00+05:30",
    agenda: [
      { time: "10:30 am", title: "Doors open, meet the cats first" },
      {
        time: "12:00 pm",
        title: "Dog runs",
        detail: "Ten-minute slots in the fenced yard, one family at a time.",
      },
      {
        time: "2:00 pm",
        title: "First-time owner session",
        detail: "Forty minutes on food, vets, and the first fortnight.",
      },
      { time: "3:30 pm", title: "Paperwork and home-check bookings" },
    ],
    bringAlong: [
      "ID and proof of address if you are hoping to adopt",
      "Your existing dog, if the new one has to live with them - by appointment only",
      "A carrier for cats; we can lend one if you tell us in advance",
    ],
    venue: {
      name: "Pawsitive Pune shelter yard",
      addressLines: ["Survey 118, Baner Road", "Next to the water tank"],
      gettingThere:
        "Parking along the service road. The 118 bus stops at Baner Phata, a four-minute walk.",
      mapQuery: "Baner Road, Pune, Maharashtra",
    },
    languages: ["Marathi", "Hindi", "English"],
    contactEmail: "adopt@pawsitivepune.org",
  },

  "solar-lamp-install": {
    about: [
      "Bhotsipa has had no grid connection since the 2023 landslide took the line out, and the replacement is years away. Ninety households get a rechargeable lamp and a small panel this weekend, fitted properly rather than handed over in a box.",
      "It is a walking weekend: the upper cluster is 40 minutes above the road head and everything goes up on our backs. Two local electricians lead the fitting; volunteers carry, mount, and sit with each household while they learn the switch.",
    ],
    endsAt: "2026-10-04T17:00:00+05:45",
    agenda: [
      { time: "7:30 am", title: "Load out from the road head" },
      { time: "9:00 am", title: "Lower cluster: 50 houses" },
      {
        time: "1:00 pm",
        title: "Lunch at the school",
        detail: "Dal bhat, cooked by the ward committee.",
      },
      { time: "2:00 pm", title: "Upper cluster: 40 houses" },
      {
        time: "Sunday, 9:00 am",
        title: "Snagging round",
        detail: "Every lamp gets checked once more before we leave.",
      },
    ],
    bringAlong: [
      "Boots with grip - the path is loose after rain",
      "A headtorch for the walk down",
      "Your own sleeping bag; the school floor is the accommodation",
    ],
    venue: {
      name: "Bhotsipa village, ward 6",
      addressLines: ["Road head at Chautara", "Then 40 minutes on foot"],
      gettingThere:
        "Jeeps leave Chautara bazaar at 6am. Tell us if you are coming from Kathmandu and we will put you on one.",
      mapQuery: "Chautara, Sindhupalchok, Nepal",
    },
    fundraiser: {
      purpose:
        "Ninety lamp-and-panel sets, mounting hardware, and the two electricians' fees for the weekend.",
      goal: 1200000,
      raised: 913000,
      currency: "NPR",
      supporters: 341,
    },
    languages: ["Nepali", "English"],
    minimumAge: 18,
    contactEmail: "field@himallight.org",
  },

  "welding-intake-day": {
    about: [
      "Intake day for the next six-month welding cohort: a short interview, a bench test, and a decision inside two weeks. Twenty-four places, no fees, no equipment cost - the course, the PPE and the certification are all covered.",
      "The bench test is not a trick. You will be shown a joint, given twenty minutes, and asked to try. Nobody is expected to arrive knowing how; what the assessors are looking at is whether you can take an instruction and stay safe with a torch in your hand.",
    ],
    endsAt: "2026-09-08T16:00:00+02:00",
    agenda: [
      { time: "8:00 am", title: "Registration and paperwork" },
      {
        time: "9:00 am",
        title: "Course briefing",
        detail: "What the six months actually ask of you, hours included.",
      },
      { time: "10:00 am", title: "Interviews, in groups of six" },
      {
        time: "1:00 pm",
        title: "Bench test",
        detail: "PPE provided. Twenty minutes each, supervised throughout.",
      },
      { time: "3:30 pm", title: "Questions with last year's cohort" },
    ],
    bringAlong: [
      "National ID and one proof of address",
      "Cotton clothing - no synthetics anywhere near the bench",
      "Closed leather shoes, mandatory to sit the test",
    ],
    venue: {
      name: "Tanaka Skills Lab, workshop 2",
      addressLines: ["14 Coventry Road", "Workington"],
      gettingThere:
        "Kombis to Workington stop at the Coventry Road turn. The workshop is the blue-roofed building at the back of the yard.",
      mapQuery: "Coventry Road, Workington, Harare",
    },
    languages: ["Shona", "English"],
    minimumAge: 18,
    contactEmail: "intake@tanakaskillslab.org",
  },

  "borewell-maintenance-webinar": {
    about: [
      "The session we wish every village water committee got before their pump failed rather than after. Two hours on how a borewell actually degrades, what maintenance costs across a year, and the argument we keep having about who pays for the repair.",
      "It is built for committee members and field staff, not engineers - there is no maths in it beyond arithmetic. The second hour is entirely questions, and we stay on until they run out.",
    ],
    endsAt: "2026-09-16T18:00:00+00:00",
    agenda: [
      { time: "4:00 pm UTC", title: "How a borewell fails, in order" },
      {
        time: "4:35 pm UTC",
        title: "The maintenance calendar",
        detail: "What to check monthly, yearly, and after a flood.",
      },
      {
        time: "5:10 pm UTC",
        title: "Who pays",
        detail: "Three funding models committees have made work.",
      },
      { time: "5:30 pm UTC", title: "Open questions" },
    ],
    bringAlong: [
      "Your pump's make and model, if you have it to hand",
      "Last year's repair costs, however roughly you know them",
    ],
    onlineAccess: {
      platform: "Zoom",
      linkDelivery:
        "The link is emailed 24 hours before, and again an hour before it starts. It does not expire; joining late is fine.",
      requirements:
        "Audio is enough - you never need to be on camera. The recording and the slide deck go out to everyone who registered, whether or not you attend.",
    },
    languages: ["English", "Hindi", "Telugu"],
    contactEmail: "learn@clearwell.org",
  },

  "morning-movement-class": {
    about: [
      "An hour of gentle, seated-and-standing exercise at the Jayanagar day centre, run every Tuesday for anyone over 60. The movement matters, but so does the tea afterwards - for a lot of the regulars this is the room they talk in.",
      "Volunteers are not instructors. You are there to walk someone in from the gate, to sit beside a person who needs steadying, and to stay for the tea. Come once and you will be asked to come again.",
    ],
    endsAt: "2026-09-01T09:00:00+05:30",
    agenda: [
      { time: "7:00 am", title: "Arrivals and chairs out" },
      {
        time: "7:20 am",
        title: "The class",
        detail: "Forty minutes, led by a physiotherapist.",
      },
      {
        time: "8:00 am",
        title: "Tea and the notice board",
        detail: "Where the actual work of the morning happens.",
      },
      { time: "8:45 am", title: "Walking the regulars home" },
    ],
    bringAlong: [
      "Nothing at all - mats and chairs are here",
      "Patience for a slow, chatty hour",
    ],
    venue: {
      name: "Sandhya day centre",
      addressLines: ["36th Cross, 7th Block", "Jayanagar"],
      gettingThere:
        "Five minutes from Jayanagar metro, exit B. The gate is beside the pharmacy.",
      mapQuery: "36th Cross, Jayanagar, Bengaluru",
    },
    // The one priced event in the fixture, and it is priced the way a
    // nonprofit prices things: nominal, per term, and waived on request.
    // Kept here so the detail page's paid branch is actually exercised -
    // every other event omits `cost` and renders as free.
    cost: {
      amount: 100,
      currency: "INR",
      note: "a term, towards tea and the physiotherapist. Waived for anyone who asks - nobody is turned away.",
    },
    languages: ["Kannada", "English", "Tamil"],
    contactEmail: "centre@sandhyacare.org",
  },

  "mangrove-planting-day": {
    about: [
      "Five thousand saplings along the exposed stretch north of the city, planted into the tidal mud on the falling tide. The stretch took the worst of the last two typhoons, and the mangrove belt that used to sit there is the cheapest sea wall anyone has ever built.",
      "The tide sets the clock, not us. We start at first light because the mud is workable until about 10am, and everything is finished and washed off before the heat arrives.",
    ],
    endsAt: "2026-10-11T12:00:00+08:00",
    agenda: [
      { time: "6:00 am", title: "Briefing on the sea wall" },
      {
        time: "6:30 am",
        title: "Planting, in lines of ten",
        detail: "Spacing is marked with rope; you will not have to judge it.",
      },
      { time: "9:00 am", title: "Water and rotation" },
      { time: "10:30 am", title: "Wash off, count, and photograph the plot" },
    ],
    bringAlong: [
      "Clothes you will throw away or wash twice",
      "Sun cover - there is no shade on the flats",
      "A change of clothes for the ride home",
    ],
    venue: {
      name: "Anibong tidal flats",
      addressLines: ["Coastal road, Barangay Anibong", "North of the port"],
      gettingThere:
        "Free jeepney from Tacloban city hall at 5:15am, returning at 11:30. Say when you register if you need a seat.",
      mapQuery: "Barangay Anibong, Tacloban City, Philippines",
    },
    fundraiser: {
      purpose:
        "Seedlings, nursery costs and two years of monitoring - a mangrove belt nobody checks on is a belt that dies.",
      goal: 400000,
      raised: 156800,
      currency: "PHP",
      supporters: 289,
    },
    languages: ["Waray", "Filipino", "English"],
    minimumAge: 15,
    contactEmail: "coast@greencorridor.org",
  },

  "night-shift-induction": {
    about: [
      "Everyone who works a winter night at the shelter door does this induction first, without exception. Two hours on safeguarding, de-escalation, and the honest version of what the door asks of you at 2am.",
      "It is deliberately not a pep talk. People leave this session deciding the night shift is not for them, and that is a good outcome - far better than finding out mid-shift with someone in front of you.",
    ],
    endsAt: "2026-09-24T20:30:00+01:00",
    agenda: [
      { time: "6:30 pm", title: "Who comes through the door, and why" },
      {
        time: "7:00 pm",
        title: "Safeguarding",
        detail: "Thresholds, reporting, and the things you never handle alone.",
      },
      {
        time: "7:40 pm",
        title: "De-escalation",
        detail: "Worked through as scenarios, out loud, in pairs.",
      },
      { time: "8:10 pm", title: "Rota, buddying and questions" },
    ],
    bringAlong: [
      "A notebook - there are three phone numbers you will want written down",
      "Your availability for December and January",
    ],
    onlineAccess: {
      platform: "Google Meet",
      linkDelivery:
        "The link arrives the morning of the session and is reused for every induction, so it is worth keeping.",
      requirements:
        "Camera on for the scenario half, please - it does not work as a lecture. This one is not recorded, for the same reason.",
    },
    languages: ["English"],
    minimumAge: 18,
    contactEmail: "nights@northstarshelter.org",
  },

  "homework-club-new-term": {
    about: [
      "The study hall reopens for the new term with 140 children registered, from third grade to the last year of secondary. Most come because home is loud, small, or empty until 8pm; the tutoring is the reason they can say they are coming.",
      "Tutors are wanted for maths and reading, and especially for the group that dislikes both. You commit to one afternoon a week for the term - a tutor who appears once and vanishes costs a child more than one who never came.",
    ],
    endsAt: "2026-09-02T19:00:00-06:00",
    agenda: [
      { time: "4:00 pm", title: "Doors, snack and register" },
      {
        time: "4:30 pm",
        title: "First block",
        detail: "Primary: reading in pairs.",
      },
      {
        time: "5:30 pm",
        title: "Second block",
        detail: "Secondary: maths and exam prep.",
      },
      { time: "6:30 pm", title: "Free hall, board games, and pickup" },
    ],
    bringAlong: [
      "A background check certificate if you already hold one",
      "Patience for the first three weeks, when nobody trusts a new tutor yet",
    ],
    venue: {
      name: "Casa Abierta study hall",
      addressLines: ["Calle Mina 118", "Colonia Guerrero"],
      gettingThere:
        "Two blocks from Guerrero metro, line B. Ring the bell on the green door.",
      mapQuery: "Calle Mina, Colonia Guerrero, Mexico City",
    },
    languages: ["Spanish", "English"],
    minimumAge: 18,
    contactEmail: "tutores@casaabierta.org",
  },

  "free-vet-clinic-mushin": {
    about: [
      "A free clinic day for working animals in Mushin - deworming, wound care, vaccination, and as much time as their owners want for questions. Cart horses and donkeys first thing, dogs and cats through the afternoon.",
      "Two vets and four para-vets run the tables. Volunteers hold, queue, record and translate, and the record-keeping matters more than it sounds: it is the only reason we can find an animal again in six months.",
    ],
    endsAt: "2026-09-14T16:30:00+01:00",
    agenda: [
      { time: "8:30 am", title: "Set up under the awning" },
      {
        time: "9:00 am",
        title: "Working animals",
        detail: "Carts and donkeys, by appointment through the union.",
      },
      { time: "12:00 pm", title: "Open queue: dogs and cats" },
      {
        time: "3:00 pm",
        title: "Owner clinic",
        detail: "Feeding, harness sores, and when to stop working an animal.",
      },
    ],
    bringAlong: [
      "Long sleeves and closed shoes",
      "Your own water; the day is hot and the queue does not shorten",
    ],
    venue: {
      name: "Mushin market, north end",
      addressLines: [
        "Ojuwoye market approach",
        "Beside the transport union office",
      ],
      gettingThere:
        "Danfos from Ojuwoye drop at the market gate. Look for the blue awning at the north end.",
      mapQuery: "Ojuwoye Market, Mushin, Lagos",
    },
    fundraiser: {
      purpose:
        "Vaccines, dewormer and wound dressings for 300 animals, plus the follow-up round in March.",
      goal: 3500000,
      raised: 1240000,
      currency: "NGN",
      supporters: 402,
    },
    languages: ["Yoruba", "English", "Pidgin"],
    minimumAge: 16,
    contactEmail: "clinics@mercypawslagos.org",
  },
};

/** The detail record for `id`, or `undefined` for an unknown route param. */
export const findEventDetail = (id?: string) =>
  id ? eventDetails[id] : undefined;
