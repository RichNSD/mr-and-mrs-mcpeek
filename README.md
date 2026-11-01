# Mr & Mrs McPeek
The Git Repo for the online gallery at [mrandmrsmcpeek.com](https://mrandmrsmcpeek.com), hosted on GitHub Pages.


## Public OneDrive Folder
The photos can be accessed, shared, and downloaded freely using this [OneDrive](https://1drv.ms/f/c/d1f69bbfaaa04b55/IgDJUEuQiiyySLiI06KsQNsaAYzAX-xdkc8qFkvskl-ZP2A?e=G5rdOc) link.
The site links here for anyone who wants every full-size original at once.


## Updating the photos
The full-size exports live in `/exports` (git-ignored; they're ~7 GB). The site uses
smaller copies that are committed to the repo:

| Folder          | Size              | Used for                                   |
| --------------- | ----------------- | ------------------------------------------ |
| `photos/thumb/` | 800px long edge   | The gallery grid                           |
| `photos/web/`   | 2000px long edge  | The full-screen viewer                     |
| `photos/full/`  | 4000px long edge  | The "Save this photo" button (print quality) |

After adding or re-exporting photos in `/exports`, rebuild them with:

```bash
pwsh scripts/build-photos.ps1
```

It only redoes photos whose export is newer than the existing copy (add `-Force` to redo
everything), strips all metadata (including GPS), and regenerates `js/photos.js`.
Photos are numbered by the digits at the end of each file name, e.g. `..._012.jpg` → `012`.
