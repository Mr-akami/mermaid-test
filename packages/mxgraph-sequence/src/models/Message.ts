import { ArrowType } from '../utils/types'

export class Message {
  id: string
  from: string       // participant id
  to: string         // participant id
  arrowType: ArrowType
  text: string
  activateFrom: boolean   // + suffix on arrow (from side)
  activateTo: boolean     // + suffix on arrow (to side)
  deactivateFrom: boolean // - suffix on arrow (from side)
  deactivateTo: boolean   // - suffix on arrow (to side)

  constructor(
    id: string,
    from: string,
    to: string,
    arrowType: ArrowType = '->>',
    text: string = ''
  ) {
    this.id = id
    this.from = from
    this.to = to
    this.arrowType = arrowType
    this.text = text
    this.activateFrom = false
    this.activateTo = false
    this.deactivateFrom = false
    this.deactivateTo = false
  }

  clone(): Message {
    const cloned = new Message(this.id, this.from, this.to, this.arrowType, this.text)
    cloned.activateFrom = this.activateFrom
    cloned.activateTo = this.activateTo
    cloned.deactivateFrom = this.deactivateFrom
    cloned.deactivateTo = this.deactivateTo
    return cloned
  }
}
