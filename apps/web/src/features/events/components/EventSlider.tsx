import { useEffect, useState } from "react";
import FeaturedEventCard from "./FeaturedEventCard";
import FeaturedEventImage from "./FeaturedEventImage";
import "./Slider.css";

/** Hand-rolled carousel — fully static content, no props. See SPEC.md. */
const EventSlider = () => {
  const slides = [
    { id: 1, content: <FeaturedEventImage /> },
    { id: 2, content: <FeaturedEventCard /> },
    { id: 3, content: <FeaturedEventImage /> },
    { id: 4, content: <FeaturedEventCard /> },
    { id: 5, content: <FeaturedEventImage /> },
    { id: 6, content: <FeaturedEventCard /> },
    { id: 7, content: <FeaturedEventImage /> },
    { id: 8, content: <FeaturedEventCard /> },
    { id: 9, content: <FeaturedEventImage /> },
    { id: 10, content: <FeaturedEventCard /> },
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % (slides.length / 2));
    }, 3000); // Slide every 3 seconds

    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <div className="slider_parent">
      <div className="slider-container">
        <div
          className="slider"
          style={{
            transform: `translateX(-${index * 100}%)`, // Moves in increments of one "slide"
          }}
        >
          {Array.from({ length: slides.length / 2 }, (_, i) => (
            <div className="slide" key={i}>
              {slides[i * 2].content}
              {slides[i * 2 + 1]?.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventSlider;
