import React, { useEffect, useState } from "react";
import axios from "axios";
import { parse } from "node-html-parser"; // Make sure to install this package
import { Box, Grid } from "@mui/material"; // Ensure you import Box and Grid

interface Character {
  name: string;
  class: string;
  level: number;
  online: boolean;
}

const HOF: React.FC = () => {
  const [topCharacters, setTopCharacters] = useState<{ [key: string]: Character[] }>({});
  const [error] = useState<string | null>(null);

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const response = await axios.get("https://corsproxy.io/?https://adventure.land/characters");
        const html = response.data; // Get the HTML response
        const root = parse(html); // Parse the HTML

        const characters: Character[] = [];
        const characterElements = root.querySelectorAll('div[style*="border: 5px solid gray"]'); // Select character divs

        characterElements.forEach((element) => {
          const nameElement = element.querySelector("div > div:nth-child(1)"); // Select the name element
          const classElement = element.querySelector("div > div:nth-child(2)"); // Select the class element
          const levelElement = element.querySelector("div > div:nth-child(3)"); // Select the level element
          const onlineElement = element.querySelector("div > div:nth-child(4)"); // Select the online status element

          const name = nameElement ? nameElement.textContent.split(": ")[1] : "Unknown"; // Extract name
          const className = classElement ? classElement.textContent.split(": ")[1] : "Unknown"; // Extract class
          const level = levelElement ? parseInt(levelElement.textContent.split(": ")[1], 10) : 0; // Extract level
          const online = onlineElement ? onlineElement.textContent.includes("Online") : false; // Check if online

          characters.push({ name, class: className, level, online }); // Include online status
        });

        // Group by class and sort
        const grouped = characters.reduce((acc, character) => {
          if (!acc[character.class]) {
            acc[character.class] = [];
          }
          acc[character.class].push(character);
          return acc;
        }, {} as { [key: string]: Character[] });

        // Get top 5 for each class
        const top5 = Object.keys(grouped).reduce((acc, className) => {
          acc[className] = grouped[className].sort((a, b) => b.level - a.level).slice(0, 10);
          return acc;
        }, {} as { [key: string]: Character[] });

        setTopCharacters(top5);
      } catch (err) {
        console.error("Error fetching characters:", err);
      }
    };
    fetchCharacters();
  }, []);

  return (
    <div>
      <h1>Top 10 Characters by Class</h1>
      {error && <p>{error}</p>}
      <Box sx={{ padding: 2 }}>
        <Grid container spacing={2}>
          {Object.keys(topCharacters)
            .slice(0, 4)
            .map((className) => (
              <Grid item xs={3} key={className}>
                <Box sx={{ padding: 2 }}>
                  <h2>{className}</h2>
                  <ul style={{ listStyleType: "none", padding: 0 }}>
                    {topCharacters[className].map((character) => (
                      <li key={character.name}>
                        <span style={{ color: character.online ? "green" : "inherit" }}>
                          <a
                            href={`https://adventure.land/character/${character.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: "underline", color: "inherit" }}
                          >
                            {character.name}
                          </a>
                        </span>
                        {` - Level ${character.level}`}
                      </li>
                    ))}
                  </ul>
                </Box>
              </Grid>
            ))}
        </Grid>
        <Grid container spacing={2}>
          {Object.keys(topCharacters)
            .slice(4, 7)
            .map((className) => (
              <Grid item xs={4} key={className}>
                <Box sx={{ padding: 2 }}>
                  <h2>{className}</h2>
                  <ul style={{ listStyleType: "none", padding: 0 }}>
                    {topCharacters[className].map((character) => (
                      <li key={character.name}>
                        <span style={{ color: character.online ? "green" : "inherit" }}>
                          <a
                            href={`https://adventure.land/character/${character.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: "underline", color: "inherit" }}
                          >
                            {character.name}
                          </a>
                        </span>
                        {` - Level ${character.level}`}
                      </li>
                    ))}
                  </ul>
                </Box>
              </Grid>
            ))}
        </Grid>
      </Box>
    </div>
  );
};

export default HOF;
