import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import dayjs from "dayjs";
import { useCallback, useState } from "react";
import type { ChangeEvent } from "react";
import { IoMdCloseCircleOutline } from "react-icons/io";
import { IoCloudUploadOutline } from "react-icons/io5";
import { useSelector } from "react-redux";
import { useEvent } from "@features/events/hooks/useEvent";
import countries from "@statics/CountryList";
import platforms from "@statics/OnlinePlatform";
import convertToBase64 from "@features/events/utils/convertToBase64";
import { Button } from "@components";
import type { EventFormState } from "../types";
import clsx from "clsx";

const formInputClasses = clsx(
  "block w-full appearance-none rounded-md border border-input-border bg-white bg-clip-padding px-3 py-1.5 font-outfit text-base leading-normal font-normal text-ink transition-[border-color,box-shadow] duration-150 ease-in-out focus:border-black focus:shadow-none focus:outline-none max-500px:text-sm!",
);

interface CreateEventsProps {
  setshowCreateModal: (open: boolean) => void;
}

/**
 * The correct, MUI-based "create event" implementation — not rendered
 * from any page today (see SPEC.md). Pairs with `useEvent.ts`; the
 * closure-identity mechanic documented there is why `handleSubmit`
 * calls `validateEvent()`/`submitCallback()` synchronously in that
 * exact order.
 */
const CreateEvents = ({ setshowCreateModal }: CreateEventsProps) => {
  const user = useSelector((state: { user?: { name?: string } }) => state.user);
  const [errors, seterrors] = useState<Record<string, string>>({});

  const [event, setevent] = useState<EventFormState>({
    name: "",
    startDate: dayjs(),
    endDate: dayjs(),
    startTime: dayjs("2022-04-17T15:30"),
    endTime: dayjs("2022-04-17T15:30"),
    mode: "Offline",
    uid: "",
    description: "",
    city: "",
    state: "",
    address: "",
    country: "India",
    mapIframe: "",
    coverImage:
      "https://images.pexels.com/videos/3045163/free-video-3045163.jpg?auto=compress&cs=tinysrgb&dpr=1&w=500",
    platform: "Zoom Meeting",
    platformLink: "",
  });

  const { validateEvent, submitCallback } = useEvent(event);

  const handleCreateBase64 = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const base64 = await convertToBase64(e);
      setevent((prevEvent) => ({
        ...prevEvent,
        coverImage: (base64 as string) ?? prevEvent.coverImage,
      }));
      e.target.value = "";
    },
    [],
  );

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setevent({ ...event, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    seterrors(validateEvent());
    submitCallback(event, setshowCreateModal);
  };

  return (
    <div className="fixed inset-0 z-20 flex size-full items-center justify-center bg-black/80 backdrop-blur-[5px]">
      <div className="relative flex max-h-[80vh] min-h-100 w-[35vw] min-w-125 flex-col overflow-auto rounded-lg bg-white p-4 text-black max-[525px]:w-[89vw] max-[525px]:min-w-55 [&::-webkit-scrollbar]:hidden!">
        <IoMdCloseCircleOutline
          className="absolute top-3.75 right-3 m-0 cursor-pointer border-0 p-0 text-[27px] text-brand-secondary shadow-none"
          onClick={() => {
            setshowCreateModal(false);
          }}
        />

        <div>
          <h1 className="font-poppins text-[2rem] font-bold text-brand-secondary max-500px:text-2xl">
            Create
          </h1>
        </div>

        <div className="flex w-full flex-col gap-[1.2rem]">
          <img
            src={event.coverImage}
            alt=""
            className="h-62.5 w-full rounded-lg object-cover"
          />

          <div className="flex justify-between gap-4">
            <div className="flex items-center justify-start gap-4 opacity-70">
              <img
                src="https://www.thetechies.org/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fuser3.04b79840.webp&w=640&q=75"
                alt=""
                className="size-10 rounded-full"
              />

              <div className="flex flex-col gap-0 font-outfit text-base leading-none text-[gray]">
                <span>Hosted by</span>
                <span>{user?.name}</span>
              </div>
            </div>

            <div>
              <label
                htmlFor="file-input"
                className="flex w-fit cursor-pointer items-center gap-4 rounded-5px bg-ink/9 px-3.75 py-2.5 font-outfit text-base max-430px:gap-2 max-430px:px-2.5 max-430px:py-1.25 max-430px:text-sm"
              >
                <IoCloudUploadOutline />
                Upload {window.innerWidth > 430 && "Thumbnail"}
              </label>
              <input
                type="file"
                id="file-input"
                className="hidden"
                onChange={handleCreateBase64}
              />
            </div>
          </div>

          <div className="flex flex-col gap-[1.2rem]">
            <input
              type="text"
              placeholder="Event Name"
              name="name"
              onChange={(e) => {
                handleChange(e);
              }}
              value={event.name}
              className={formInputClasses}
            />

            {errors.name && (
              <span className="mt-1.25 mb-0 font-outfit text-body text-red-600">
                {errors.name}
              </span>
            )}

            <div className="CreateEvents_date_range mt-8 flex justify-between gap-4">
              <DatePicker
                label="Start Date"
                value={event.startDate}
                name="startDate"
                onChange={(newValue) =>
                  setevent({ ...event, startDate: newValue })
                }
                format="DD-MM-YY"
              />

              <TimePicker
                label="Start Time"
                value={event.startTime}
                name="startTime"
                onChange={(newValue) =>
                  setevent({ ...event, startTime: newValue })
                }
              />
            </div>

            <div className="CreateEvents_date_range mt-8 flex justify-between gap-4">
              <DatePicker
                label="End Date"
                value={event.endDate}
                name="endDate"
                onChange={(newValue) =>
                  setevent({ ...event, endDate: newValue })
                }
                format="DD-MM-YY"
              />

              <TimePicker
                label="End Time"
                value={event.endTime}
                name="endTime"
                onChange={(newValue) =>
                  setevent({ ...event, endTime: newValue })
                }
              />
            </div>

            <FormControl fullWidth className="my-8">
              <InputLabel
                id="demo-simple-select-label label"
                className="font-poppins text-body! max-500px:text-sm!"
              >
                Event Mode
              </InputLabel>
              <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={event.mode}
                name="mode"
                label="Event Mode"
                className="font-poppins text-body! max-500px:text-sm!"
                onChange={(e) => {
                  setevent({
                    ...event,
                    mode: e.target.value as EventFormState["mode"],
                  });
                }}
              >
                <MenuItem value={"Online"}>Online</MenuItem>
                <MenuItem value={"Offline"}>Offline</MenuItem>
              </Select>
            </FormControl>

            <input
              type="text"
              placeholder="Event Unique ID"
              name="uid"
              value={event.uid}
              onChange={(e) => {
                handleChange(e);
              }}
              className={formInputClasses}
            />
            {errors.uid && (
              <span className="mt-1.25 mb-0 font-outfit text-body text-red-600">
                {errors.uid}
              </span>
            )}

            <textarea
              placeholder="Event Description"
              name="description"
              value={event.description}
              onChange={(e) => {
                handleChange(e);
              }}
              className={`${formInputClasses} mt-8 min-h-37.5 placeholder:font-poppins placeholder:text-base! max-500px:placeholder:text-sm!`}
            />
            {errors.description && (
              <span className="mt-1.25 mb-0 font-outfit text-body text-red-600">
                {errors.description}
              </span>
            )}

            {event?.mode === "Offline" ? (
              <Accordion
                defaultExpanded
                className="my-8 items-center justify-between rounded-md border border-input-border bg-transparent px-2.5 py-0 shadow-none"
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="panel1-content"
                  id="panel1-header"
                  className="p-0"
                >
                  <p className="mb-0 font-poppins text-base">
                    Location Details
                  </p>
                </AccordionSummary>

                <div className="flex items-center justify-between gap-4">
                  <AccordionDetails className="mb-2.5 flex w-full flex-col p-0">
                    <input
                      type="text"
                      placeholder="City"
                      name="city"
                      value={event.city}
                      onChange={(e) => {
                        handleChange(e);
                      }}
                      className={formInputClasses}
                    />
                    {errors.city && (
                      <span className="mt-1.25 mb-0 font-outfit text-body text-red-600">
                        {errors.city}
                      </span>
                    )}
                  </AccordionDetails>
                  <AccordionDetails className="mb-2.5 flex w-full flex-col p-0">
                    <input
                      type="text"
                      placeholder="State"
                      name="state"
                      value={event.state}
                      onChange={(e) => {
                        handleChange(e);
                      }}
                      className={formInputClasses}
                    />
                    {errors.state && (
                      <span className="mt-1.25 mb-0 font-outfit text-body text-red-600">
                        {errors.state}
                      </span>
                    )}
                  </AccordionDetails>
                </div>

                <AccordionDetails className="mb-2.5 flex w-full flex-col p-0">
                  <input
                    type="text"
                    placeholder="Address"
                    name="address"
                    value={event.address}
                    onChange={(e) => {
                      handleChange(e);
                    }}
                    className={formInputClasses}
                  />
                  {errors.address && (
                    <span className="mt-1.25 mb-0 font-outfit text-body text-red-600">
                      {errors.address}
                    </span>
                  )}
                </AccordionDetails>

                <FormControl fullWidth className="mt-8 mb-4">
                  <InputLabel
                    id="demo-simple-select-label label"
                    className="font-poppins text-[0.9rem] max-500px:text-sm!"
                  >
                    Country Name
                  </InputLabel>
                  <Select
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
                    value={event.country}
                    name="country"
                    label="Event Mode"
                    className="font-poppins text-[0.9rem] max-500px:text-sm!"
                    onChange={(e) => {
                      setevent({ ...event, country: e.target.value });
                    }}
                  >
                    {countries.map((country, index) => {
                      return (
                        <MenuItem value={country.label} key={index}>
                          {country.label}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>

                <AccordionDetails className="mb-2.5 flex w-full flex-col p-0">
                  <input
                    type="text"
                    placeholder="Map Iframe"
                    name="mapIframe"
                    value={event.mapIframe}
                    onChange={(e) => {
                      handleChange(e);
                    }}
                    className={formInputClasses}
                  />
                  {errors.mapIframe && (
                    <span className="mt-1.25 mb-0 font-outfit text-body text-red-600">
                      {errors.mapIframe}
                    </span>
                  )}
                </AccordionDetails>
              </Accordion>
            ) : (
              <Accordion
                defaultExpanded
                className="my-8 items-center justify-between rounded-md border border-input-border bg-transparent px-2.5 py-0 shadow-none"
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="panel1-content"
                  id="panel1-header"
                  className="p-0"
                >
                  <p className="mb-0 font-poppins text-base">Meeting Details</p>
                </AccordionSummary>

                <FormControl fullWidth className="mt-8 mb-4">
                  <InputLabel
                    id="demo-simple-select-label label"
                    className="font-poppins text-[0.9rem] max-500px:text-sm!"
                  >
                    Online Platform
                  </InputLabel>
                  <Select
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
                    value={event.platform}
                    name="platform"
                    label="Event Mode"
                    className="font-poppins text-[0.9rem] max-500px:text-sm!"
                    onChange={(e) => {
                      setevent({ ...event, platform: e.target.value });
                    }}
                  >
                    {platforms.map((platform, index) => {
                      return (
                        <MenuItem value={platform.label} key={index}>
                          <img
                            src={platform.icon}
                            alt=""
                            className="mr-2.5 size-5"
                          />
                          {platform.label}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>

                <AccordionDetails className="mb-2.5 flex w-full flex-col p-0">
                  <input
                    type="text"
                    placeholder="Platform Link"
                    name="platformLink"
                    value={event.platformLink}
                    onChange={(e) => {
                      handleChange(e);
                    }}
                    className={formInputClasses}
                  />
                  {errors.platformLink && (
                    <span className="mt-1.25 mb-0 font-outfit text-body text-red-600">
                      {errors.platformLink}
                    </span>
                  )}
                </AccordionDetails>
              </Accordion>
            )}
          </div>

          <Button onClickfunction={handleSubmit}>Create</Button>
        </div>
      </div>
    </div>
  );
};

export default CreateEvents;
