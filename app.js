import express from "express";
import compressImages from "compress-images";
import formidable from "express-formidable";
import fileSystem from "fs";

const app = express();

app.use(formidable());

app.set("view engine", "ejs");

app.use(express.static("public"));

app.get("/", function (request, result) {
  const isCompressed = false;
  result.render("index", { isCompressed });
});

app.post("/compressImage", function (request, result) {
  const image = request.files.image;
  if (image.size > 0) {
    if (image.type == "image/png" || image.type == "image/jpeg") {
      fileSystem.readFile(image.path, function (error, data) {
        if (error) throw error;

        const filePath = "temp-uploads/" + new Date().getTime() + "-" + image.name;
        const compressedFilePath = "uploads/";
        const compression = 60;

        // Ensure temp-uploads and uploads directory exists
        if (!fileSystem.existsSync("temp-uploads")) {
          fileSystem.mkdirSync("temp-uploads");
        }

        if (!fileSystem.existsSync("uploads")) {
          fileSystem.mkdirSync("uploads");
        }

        fileSystem.writeFile(filePath, data, async function (error) {
          if (error) throw error;

          compressImages(
            filePath,
            compressedFilePath,
            { compress_force: false, statistic: true, autoupdate: true },
            false,
            { jpg: { engine: "mozjpeg", command: ["-quality", compression] } },
            {
              png: {
                engine: "pngquant",
                command: ["--quality=" + compression + "-" + compression, "-o"],
              },
            },
            { svg: { engine: "svgo", command: "--multipass" } },
            { gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] } },
            async function (error, completed, statistic) {
              console.log("-------------");
              console.log(error);
              console.log(completed);
              console.log(statistic);
              console.log("-------------");

              fileSystem.unlink(filePath, function (error) {
                if (error) throw error;
              });
            }
          );
          result.render("index", { isCompressed: true });
          //   result.send("File has been compressed and saved.");
        });

        fileSystem.unlink(image.path, function (error) {
          if (error) throw error;
        });
      });
    } else {
      result.send("Please select an image");
    }
  } else {
    result.send("Please select an image");
  }
});

const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Server running on port: http://localhost:${port}`));

export default app;
