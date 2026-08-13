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
import { IoMdCloseCircleOutline } from "react-icons/io";
import { IoCloudUploadOutline } from "react-icons/io5";
import { useSelector } from "react-redux";
import { useEvent } from "../../../../hooks/useEvent";
import countries from "../../../../static/CountryList";
import platforms from "../../../../static/OnlinePlatform";
import convertToBase64 from "../../../../utils/convertToBase64";
import { Button } from "../../../shared";
import "./CreateEvents.scss";

const CreateEvents = ({ setshowCreateModal }) => {
  const user = useSelector((state) => state.user);
  const [errors, seterrors] = useState({});

  const [event, setevent] = useState({
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

  const handleCreateBase64 = useCallback(async (e) => {
    const base64 = await convertToBase64(e);
    setevent((prevEvent) => ({ ...prevEvent, coverImage: base64 }));
    e.target.value = "";
  }, []);

  const handleChange = (e) => {
    setevent({ ...event, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    seterrors(validateEvent());
    submitCallback(event, setshowCreateModal);
  };

  return (
    <div className="createevent_overlay">
      <div className="createevent_modal">
        <IoMdCloseCircleOutline
          className="crossButton"
          onClick={() => {
            setshowCreateModal(false);
          }}
        />

        <div className="createevent_header">
          <h1>Create</h1>
        </div>

        <div className="createevent_form">
          <img src={event.coverImage} alt="" />

          <div className="form_header">
            <div className="host">
              <img
                src="https://www.thetechies.org/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fuser3.04b79840.webp&w=640&q=75"
                alt=""
              />

              <div className="details">
                <span>Hosted by</span>
                <span>{user?.name}</span>
              </div>
            </div>

            <div className="thumbnail">
              <label htmlFor="file-input">
                <IoCloudUploadOutline />
                Upload {window.innerWidth > 430 && "Thumbnail"}
              </label>
              <input
                type="file"
                id="file-input"
                onChange={handleCreateBase64}
              />
            </div>
          </div>

          <div className="form_inputs">
            <input
              type="text"
              placeholder="Event Name"
              name="name"
              onChange={(e) => {
                handleChange(e);
              }}
              value={event.name}
            />

            {errors.name && (
              <span className="error_message">{errors.name}</span>
            )}

            <div className="date_range">
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

            <div className="date_range">
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

            <FormControl fullWidth className="event_mode">
              <InputLabel id="demo-simple-select-label label">
                Event Mode
              </InputLabel>
              <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={event.mode}
                name="mode"
                label="Event Mode"
                className="select"
                onChange={(e) => {
                  handleChange(e);
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
            />
            {errors.uid && <span className="error_message">{errors.uid}</span>}

            <textarea
              type="text"
              placeholder="Event Description"
              name="description"
              value={event.description}
              onChange={(e) => {
                handleChange(e);
              }}
            />
            {errors.description && (
              <span className="error_message">{errors.description}</span>
            )}

            {event?.mode === "Offline" ? (
              <Accordion defaultExpanded className="location">
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="panel1-content"
                  id="panel1-header"
                  className="location_header"
                >
                  <p>Location Details</p>
                </AccordionSummary>

                <div className="location_citystate">
                  <AccordionDetails className="accordionbody">
                    <input
                      type="text"
                      placeholder="City"
                      name="city"
                      value={event.city}
                      onChange={(e) => {
                        handleChange(e);
                      }}
                    />
                    {errors.city && (
                      <span className="error_message">{errors.city}</span>
                    )}
                  </AccordionDetails>
                  <AccordionDetails className="accordionbody">
                    <input
                      type="text"
                      placeholder="State"
                      name="state"
                      value={event.state}
                      onChange={(e) => {
                        handleChange(e);
                      }}
                    />
                    {errors.state && (
                      <span className="error_message">{errors.state}</span>
                    )}
                  </AccordionDetails>
                </div>

                <AccordionDetails className="accordionbody">
                  <input
                    type="text"
                    placeholder="Address"
                    name="address"
                    value={event.address}
                    onChange={(e) => {
                      handleChange(e);
                    }}
                  />
                  {errors.address && (
                    <span className="error_message">{errors.address}</span>
                  )}
                </AccordionDetails>

                <FormControl fullWidth className="country_accordion">
                  <InputLabel id="demo-simple-select-label label">
                    Country Name
                  </InputLabel>
                  <Select
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
                    value={event.country}
                    name="country"
                    label="Event Mode"
                    className="select"
                    onChange={(e) => {
                      handleChange(e);
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

                <AccordionDetails className="accordionbody">
                  <input
                    type="text"
                    placeholder="Map Iframe"
                    name="mapIframe"
                    value={event.mapIframe}
                    onChange={(e) => {
                      handleChange(e);
                    }}
                  />
                  {errors.mapIframe && (
                    <span className="error_message">{errors.mapIframe}</span>
                  )}
                </AccordionDetails>
              </Accordion>
            ) : (
              <Accordion defaultExpanded className="location">
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="panel1-content"
                  id="panel1-header"
                  className="location_header"
                >
                  <p>Meeting Details</p>
                </AccordionSummary>

                <FormControl fullWidth className="country_accordion">
                  <InputLabel id="demo-simple-select-label label">
                    Online Platform
                  </InputLabel>
                  <Select
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
                    value={event.platform}
                    name="platform"
                    label="Event Mode"
                    className="select"
                    onChange={(e) => {
                      handleChange(e);
                    }}
                  >
                    {platforms.map((platform, index) => {
                      return (
                        <MenuItem value={platform.label} key={index}>
                          <img
                            src={platform.icon}
                            alt=""
                            style={{
                              width: "20px",
                              height: "20px",
                              marginRight: "10px",
                            }}
                          />
                          {platform.label}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>

                <AccordionDetails className="accordionbody">
                  <input
                    type="text"
                    placeholder="Platform Link"
                    name="platformLink"
                    value={event.platformLink}
                    onChange={(e) => {
                      handleChange(e);
                    }}
                  />
                  {errors.platformLink && (
                    <span className="error_message">{errors.platformLink}</span>
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
