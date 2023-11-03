'use client'

import { Transition } from '@headlessui/react'
import classNames from 'classnames'
import SortMenu from '@/components/SortMenu'
import { Fragment, memo, useMemo, useState } from 'react'
import { SortOption, DataFeature, SortOptionType } from '@/lib/types'
import { DateAddedIcon } from './DateAddedIcon'
import { sortBy } from 'lodash'
import Image from 'next/image'
import AdBlock from './Ad'
import { useConfig } from '@/lib/configContext'
import useTranslation from '@/hooks/useTranslation'

const FoundList = ({
  found,
  idMap,
  setHoveredId,
  hoveredId,
  hideLabels,
  zoomToFeature,
}: {
  found: number[]
  idMap: Map<number, DataFeature>
  setHoveredId: (id: number | null) => void
  hoveredId: number | null
  hideLabels?: boolean
  zoomToFeature: (id: number) => void
}) => {
  const { LINES } = useConfig()
  const { t } = useTranslation()

  const sortOptions: SortOption[] = useMemo(() => {
    return [
      {
        name: 'Date added',
        id: 'order',
        shortName: <DateAddedIcon className="h-4 w-4" />,
      },
      { name: 'Name', id: 'name', shortName: 'A-Z' },
      { name: 'Line', id: 'line', shortName: '1-9' },
    ]
  }, [])

  const [sort, setSort] = useState<SortOptionType>('order')

  const sorted = useMemo(() => {
    switch (sort) {
      case 'order':
        return found

      case 'name':
        return sortBy(found, (id) => {
          const feature = idMap.get(id)
          if (!feature) return null
          return feature.properties.name
        })

      case 'line':
        return sortBy(
          found,
          (id) => {
            const feature = idMap.get(id)
            if (!feature) return null
            if (!feature.properties.line) return Infinity
            return LINES[feature.properties.line]?.order || Infinity
          },
          // then by location, roughly
          (id) => {
            const feature = idMap.get(id)
            if (!feature) return null
            if (feature.geometry.type === 'Point') {
              return (
                100 * feature.geometry.coordinates[0] +
                feature.geometry.coordinates[1]
              )
            } else {
              return feature.properties.name
            }
          },
        )

      default:
        return found
    }
  }, [found, sort, idMap, LINES])

  const grouped = useMemo(() => {
    const grouped = []
    let lastName = ''
    for (let id of sorted) {
      const feature = idMap.get(id)
      if (!feature) continue

      if (feature.properties.name === lastName) {
        grouped[grouped.length - 1].push(feature)
      } else {
        grouped.push([feature])
        lastName = feature.properties.name
      }
    }

    return grouped
  }, [sorted, idMap])

  return (
    <div>
      {sorted.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase text-zinc-900 text-opacity-75">
              {t('stations', { count: sorted.length })}
            </p>
          </div>

          <SortMenu sortOptions={sortOptions} sort={sort} setSort={setSort} />
        </div>
      )}
      <ol className={classNames({ 'blur-md transition-all': hideLabels })}>
        {grouped.map((features, i) => {
          if (i % 20 === 19) {
            return (
              <Fragment key={features[0].id}>
                <GroupedLine
                  key={features[0].id}
                  features={features}
                  zoomToFeature={zoomToFeature}
                  setHoveredId={setHoveredId}
                  hoveredId={hoveredId}
                />
                <AdBlock />
              </Fragment>
            )
          }
          return (
            <GroupedLine
              key={features[0].id}
              features={features}
              zoomToFeature={zoomToFeature}
              setHoveredId={setHoveredId}
              hoveredId={hoveredId}
            />
          )
        })}
      </ol>
    </div>
  )
}

const GroupedLine = memo(
  ({
    features,
    zoomToFeature,
    setHoveredId,
    hoveredId,
  }: {
    features: DataFeature[]
    zoomToFeature: (id: number) => void
    setHoveredId: (id: number | null) => void
    hoveredId: number | null
  }) => {
    const { LINES } = useConfig()
    const times = features.length

    return (
      <Transition
        appear={true}
        as="li"
        key={features[0].id}
        show={true}
        enter="transition-all duration-250"
        enterFrom="h-0 opacity-0"
        enterTo="h-8 opacity-100"
        leave="transition-opacity duration-250"
        leaveFrom="h-8 opacity-100"
        leaveTo="h-0 opacity-0"
      >
        <button
          onClick={() => zoomToFeature(features[0].properties.id!)}
          onMouseOver={() => setHoveredId(+features[0].id!)}
          onMouseOut={() => setHoveredId(null)}
          className={classNames(
            'flex w-full items-center rounded px-2 py-1 text-sm',
            {
              'bg-yellow-400 shadow-sm': features.some(
                (f) => f.id === hoveredId,
              ),
            },
          )}
        >
          {sortBy(features, (f) => LINES[f.properties.line || '']?.order).map(
            (feature) => {
              return (
                <Image
                  key={feature.id!}
                  alt={feature.properties.line || ''}
                  src={`/images/${feature.properties.line}.svg`}
                  width={64}
                  height={64}
                  className="-mr-0.5 h-5 w-5 overflow-visible object-cover"
                />
              )
            },
          )}

          <span className="ml-2.5 max-w-md truncate">
            {features[0].properties.name}
          </span>
          {times > 1 && (
            <span className="ml-auto font-sans font-light text-gray-500">
              ｘ{times}
            </span>
          )}
        </button>
      </Transition>
    )
  },
)
GroupedLine.displayName = 'GroupedLine'

export default FoundList
