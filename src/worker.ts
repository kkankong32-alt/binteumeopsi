import { coverage, boxPoly, multi } from "./geometry";
import { sceneTiles } from "./render";
self.onmessage = ({ data }) => {
  try {
    const { id, p, box } = data;
    self.postMessage({
      id,
      result: coverage(
        sceneTiles(p, box).map((t) => t.p),
        multi(boxPoly(box)),
      ),
    });
  } catch (e) {
    self.postMessage({ id: data.id, error: String(e) });
  }
};
