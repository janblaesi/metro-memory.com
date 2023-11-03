'use client'

import normalizeString from '@/lib/normalizeString'
import classNames from 'classnames'
import { useState, KeyboardEventHandler, useCallback } from 'react'
import Fuse from 'fuse.js'
import { DataFeature } from '@/lib/types'
import { Transition } from '@headlessui/react'
import { Feature, Point } from 'geojson'
import useTranslation from '@/hooks/useTranslation'

const Input = ({
  fuse,
  found,
  setFound,
  setIsNewPlayer,
  inputRef,
  map,
  idMap,
}: {
  fuse: Fuse<DataFeature>
  found: number[]
  setFound: (found: number[]) => void
  setIsNewPlayer: (isNewPlayer: boolean) => void
  inputRef: React.RefObject<HTMLInputElement>
  map: mapboxgl.Map | null
  idMap: Map<number, DataFeature>
}) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState<string>('')
  const [wrong, setWrong] = useState<boolean>(false)
  const [success, setSuccess] = useState<boolean>(false)
  const [alreadyFound, setAlreadyFound] = useState<boolean>(false)

  const zoomToStation = useCallback(
    (id: number) => {
      if (map) {
        const feature = idMap.get(id) as Feature<Point>

        if (!feature) return
        const [lng, lat] = feature.geometry.coordinates
        map.flyTo({
          center: [lng, lat],
          zoom: 13,
          duration: 200,
        })
      }
    },
    [map, idMap],
  )

  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (e.key !== 'Enter') return
      if (!search) return

      e.preventDefault()

      const sanitizedSearch = normalizeString(search)
      const results = fuse.search(sanitizedSearch)
      let someAlreadyFound = false
      const matches: number[] = []
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        if (
          result.matches &&
          result.matches.length &&
          result.matches.some(
            (match) =>
              match.indices[0][0] < 2 &&
              match.value!.length - match.indices[match.indices.length - 1][1] <
                2 &&
              Math.abs(match.value!.length - sanitizedSearch.length) < 4,
          )
        ) {
          if ((found || []).indexOf(+result.item.id!) === -1) {
            matches.push(+result.item.id!)
          } else {
            someAlreadyFound = true
            setAlreadyFound(true)
            setTimeout(() => setAlreadyFound(false), 1200)
          }
        }
      }

      if (matches.length === 0 && !someAlreadyFound) {
        setWrong(true)
        setTimeout(() => setWrong(false), 500)
        return
      } else {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 250)
        if (map) {
          ;(map.getSource('hovered') as mapboxgl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: (matches || []).map((id) => idMap.get(id)!),
          })

          setTimeout(() => {
            ;(map.getSource('hovered') as mapboxgl.GeoJSONSource).setData({
              type: 'FeatureCollection',
              features: [],
            })
          }, 1500)
        }

        zoomToStation(matches[0])
        setFound([...matches, ...(found || [])])
        setIsNewPlayer(false)
        setSearch('')
      }
    },
    [
      search,
      setSearch,
      fuse,
      found,
      setFound,
      setWrong,
      setIsNewPlayer,
      map,
      idMap,
      zoomToStation,
    ],
  )

  return (
    <div className="relative grow">
      <input
        className={classNames(
          {
            'animate animate-shake': wrong,
            'shadow-md !shadow-yellow-500': success,
          },
          'relative z-40 w-full rounded-full px-4 py-2 text-lg font-bold text-zinc-900 caret-current shadow-lg outline-none ring-zinc-800 transition-shadow duration-300 focus:ring-2',
        )}
        ref={inputRef}
        placeholder={t('inputPlaceholder')}
        value={search}
        onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
        id="input"
        type="text"
        autoFocus
        onKeyDown={onKeyDown}
      ></input>
      <Transition
        show={alreadyFound}
        as="div"
        className="pointer-events-none absolute right-0 top-0 z-50 my-auto mt-1 flex h-auto items-center"
        enter="transition-opacity duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity duration-500"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="my-1 mr-2 flex items-center justify-center rounded-full border-green-400 bg-green-200 px-2 py-1 text-sm font-bold text-green-800">
          {t('alreadyFound')}
        </div>
      </Transition>
    </div>
  )
}

export default Input
