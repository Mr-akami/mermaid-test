import { NotePosition } from '../utils/types'

export class Note {
  id: string
  position: NotePosition
  actors: string[]  // participant ids
  text: string

  constructor(
    id: string,
    position: NotePosition,
    actors: string[],
    text: string = ''
  ) {
    this.id = id
    this.position = position
    this.actors = actors
    this.text = text
  }

  clone(): Note {
    return new Note(this.id, this.position, [...this.actors], this.text)
  }
}
