import { RefEntities } from 'src/constant/ref.constant';
import { DataSource, In, ObjectLiteral } from 'typeorm';

export class EntityRelation {
  /**
   *
   * @param dataSource
   */
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Finds related entities for a given entity name and criteria.
   * @param entityName The name of the entity to find related entities for.
   * @param criteria The criteria to find related entities with, where the `refId` key is the ID of the
   * parent entity and the `refTable` key is the name of the parent entity table.
   * @param criteria.refId
   * @param criteria.refTable
   * @returns An array of the related entities.
   */
  private async getRelatedEntities(entityName: string, criteria: { refId: string; refTable: string }) {
    const repo = this.dataSource.getRepository(entityName);
    return await repo.find({ where: criteria });
  }

  /**
   * Resolves nested relations of an entity.
   * @param parent - The entity to resolve relations for.
   * @param levels - The relation levels to resolve, e.g. ['category', 'brand'].
   * @param parentEntityName - The name of the parent entity.
   * @param parentRefId - The ID of the parent entity.
   * @returns {Promise<void>}
   */
  private async resolveNestedRelations(
    parent: ObjectLiteral,
    levels: string[],
    parentEntityName: string,
    parentRefId: string,
  ) {
    if (levels.length === 0) return;

    const [currentLevel, ...nextLevels] = levels;

    if ((Object.values(RefEntities) as string[]).includes(currentLevel)) {
      const relatedEntities = await this.getRelatedEntities(currentLevel, {
        refId: parentRefId,
        refTable: parentEntityName,
      });
      parent[currentLevel] = relatedEntities;

      for (const entity of relatedEntities) {
        await this.resolveNestedRelations(entity, nextLevels, currentLevel, entity.id);
      }
    } else {
      const repo = this.dataSource.getRepository(parentEntityName);
      const parentEntity = await repo.findOne({
        where: { id: parentRefId },
        relations: [currentLevel],
      });

      if (parentEntity?.[currentLevel]) {
        parent[currentLevel] = parentEntity[currentLevel];

        const relationMetadata = repo.metadata.findRelationWithPropertyPath(currentLevel);
        const targetEntityName = relationMetadata?.inverseEntityMetadata.name || currentLevel;

        const nestedItems = Array.isArray(parentEntity[currentLevel])
          ? parentEntity[currentLevel]
          : [parentEntity[currentLevel]];

        for (const item of nestedItems) {
          if (item?.id && nextLevels.length > 0) {
            await this.resolveNestedRelations(item, nextLevels, targetEntityName, item.id);
          }
        }
      }
    }
  }

  /**
   * Finds related entities for a given array of parent entity IDs.
   *
   * @param entityName The name of the entity to find related entities for
   * @param parentIds The IDs of the parent entities to find related entities for
   * @param parentTableName The name of the parent entity table
   * @returns An array of the related entities
   */
  private async getBulkRelatedEntities(entityName: string, parentIds: string[], parentTableName: string) {
    const repo = this.dataSource.getRepository(entityName);
    return await repo.find({
      where: {
        refId: In(parentIds),
        refTable: parentTableName,
      },
    });
  }

  /**
   * Groups the related entities by the ID of the parent entity.
   * The key of the returned object is the parent ID, and the value is an array of related entities
   * that reference that parent entity.
   * @param relatedEntities The related entities to group
   * @returns A record where the key is the ID of the parent entity and the value is an array of related entities
   */
  private groupRelatedEntitiesByParent(relatedEntities: ObjectLiteral[]): ObjectLiteral {
    return relatedEntities.reduce<Record<string, Record<string, unknown>[]>>((grouped, entity) => {
      const parentId = entity.refId as string;
      if (!grouped[parentId]) {
        grouped[parentId] = [];
      }
      grouped[parentId].push(entity);
      return grouped;
    }, {});
  }

  /**
   * Finds related entities for an entity with the ability to also retrieve
   * reverse related entities. This is useful for retrieving related entities on a 1:N or
   * M:N relationship where the current entity is the one being referenced.
   *
   * @param id The ID of the entity to find related entities for
   * @param entityName The name of the entity to find related entities for
   * @param queryParams The query parameters to include, where the `includeRef` parameter
   * is the only one that is used
   * @returns The entities with their related entities resolved
   */
  async findRefEntitiesWithReverse(
    id: string,
    entityName: string,
    queryParams: Record<string, string>,
  ): Promise<Record<string, unknown>> {
    const includeRef = queryParams.includeRef;
    const includedData: Record<string, unknown> = {};

    if (includeRef) {
      const includePaths = includeRef.split('|');
      let successfulLookups = 0;
      const errors: string[] = [];

      for (const path of includePaths) {
        try {
          const [level2, ...restLevels] = path.split('.');

          const currentEntity = await this.dataSource.getRepository(entityName).findOne({
            where: { id },
          });

          if (!currentEntity) continue;

          let relatedEntities: Record<string, unknown>[];

          if (this.isReverseLookupSingle(currentEntity, level2)) {
            relatedEntities = await this.getSingleReverseRelatedEntities(currentEntity, level2);
          } else {
            relatedEntities = await this.getRelatedEntities(level2, {
              refId: id,
              refTable: entityName,
            });
          }

          // Only include if we found related entities
          if (relatedEntities.length > 0) {
            includedData[level2] = relatedEntities;
            successfulLookups++;

            for (const item of relatedEntities) {
              await this.resolveNestedRelations(item, restLevels, level2, item.id as string);
            }
          }
        } catch (error) {
          errors.push(`Failed to lookup ${path}: ${(error as Error).message}`);
        }
      }

      // Only throw error if all lookups failed and we have actual errors
      if (successfulLookups === 0 && errors.length > 0) {
        throw new Error(`All relation lookups failed: ${errors.join(', ')}`);
      }
    }

    return includedData;
  }

  /**
   * Checks if the given entity performs a reverse lookup on the target entity.
   * A reverse lookup is when the current entity references the target entity through
   * its `refTable` and `refId`.
   *
   * @param entity - The current entity to check.
   * @param targetEntityName - The name of the target entity.
   * @returns True if the current entity's `refTable` matches the target entity name;
   * otherwise, false.
   */
  private isReverseLookupSingle(entity: Record<string, unknown>, targetEntityName: string): boolean {
    // Check if the current entity has refId and refTable pointing to the target
    return entity.refTable === targetEntityName;
  }

  /**
   * Finds the related entity in the target entity table by performing a reverse lookup
   * based on the current entity's `refTable` and `refId` fields.
   *
   * @param currentEntity - The current entity to perform the lookup on.
   * @param targetEntityName - The name of the target entity table.
   * @returns An array containing the found related entity, or an empty array if not found.
   */
  private async getSingleReverseRelatedEntities(
    currentEntity: ObjectLiteral,
    targetEntityName: string,
  ): Promise<ObjectLiteral[]> {
    if (currentEntity.refTable !== targetEntityName) {
      return [];
    }

    const repo = this.dataSource.getRepository(targetEntityName);
    const targetEntity = await repo.findOne({
      where: { id: currentEntity.refId },
    });

    return targetEntity ? [targetEntity] : [];
  }

  /**
   * Finds all related entities for an array of entities with the ability to also retrieve
   * reverse related entities. This is useful for retrieving related entities on a 1:N or
   * M:N relationship where the current entities are the ones being referenced.
   *
   * @param entities The entities to find related entities for
   * @param entityName The name of the entity to find related entities for
   * @param queryParams The query parameters to include, where the `includeRef` parameter
   * is the only one that is used
   * @returns The entities with their related entities resolved
   */
  async findManyRefEntitiesWithReverse(
    entities: ObjectLiteral[],
    entityName: string,
    queryParams: Record<string, string>,
  ): Promise<ObjectLiteral[]> {
    const includeRef = queryParams.includeRef;

    if (!includeRef || entities.length === 0) {
      return entities;
    }

    const includePaths = includeRef.split('|');
    let successfulLookups = 0;
    const errors: string[] = [];

    for (const path of includePaths) {
      try {
        const [level2, ...restLevels] = path.split('.');
        const entityIds = entities.map((entity) => entity.id as string);

        let allRelatedEntities: Record<string, unknown>[];
        let groupedRelated: Record<string, Record<string, unknown>[]>;

        if (this.isReverseLookup(entities[0], level2)) {
          allRelatedEntities = await this.getReverseRelatedEntities(level2, entityIds, entityName);
          groupedRelated = this.groupReverseRelatedEntities(allRelatedEntities, entities, level2);
        } else {
          allRelatedEntities = await this.getBulkRelatedEntities(level2, entityIds, entityName);
          groupedRelated = this.groupRelatedEntitiesByParent(allRelatedEntities);
        }

        // Check if any entities got relations
        const hasRelations = Object.values(groupedRelated).some((relations) => relations.length > 0);

        if (hasRelations) {
          successfulLookups++;

          for (const entity of entities) {
            const entityId = entity.id as string;
            const relatedEntities = groupedRelated[entityId] || [];

            if (relatedEntities.length > 0) {
              entity[level2] = relatedEntities;

              if (restLevels.length > 0) {
                for (const relatedEntity of relatedEntities) {
                  await this.resolveNestedRelations(relatedEntity, restLevels, level2, relatedEntity.id as string);
                }
              }
            }
          }
        }
      } catch (error) {
        errors.push(`Failed to lookup ${path}: ${(error as Error).message}`);
      }
    }

    // Only throw error if all lookups failed and we have actual errors
    if (successfulLookups === 0 && errors.length > 0) {
      throw new Error(`All relation lookups failed: ${errors.join(', ')}`);
    }

    return entities;
  }

  /**
   * Determines if the given entity performs a reverse lookup on the target entity.
   * A reverse lookup is when the current entity references the target entity through
   * its `refTable` and `refId`.
   *
   * @param entity - The current entity to check.
   * @param targetEntityName - The name of the target entity.
   * @returns True if the current entity's `refTable` matches the target entity name
   * or if the target entity name is included in the known reference entities; otherwise, false.
   */
  private isReverseLookup(entity: ObjectLiteral, targetEntityName: string): boolean {
    return entity.refTable === targetEntityName || (Object.values(RefEntities) as string[]).includes(targetEntityName);
  }

  /**
   * Retrieves related entities in a reverse lookup (where the current entities reference the target entities).
   * @param targetEntityName - Name of the target entity.
   * @param currentEntityIds - IDs of the current entities.
   * @param currentEntityName - Name of the current entity.
   * @returns An array of the related target entities.
   */
  private async getReverseRelatedEntities(
    targetEntityName: string,
    currentEntityIds: string[],
    currentEntityName: string,
  ) {
    const repo = this.dataSource.getRepository(targetEntityName);

    // Find target entities where any current entity references them
    const currentEntities = await this.dataSource.getRepository(currentEntityName).find({
      where: { id: In(currentEntityIds) },
    });

    const targetIds = [
      ...new Set(
        currentEntities.filter((entity) => entity.refTable === targetEntityName).map((entity) => entity.refId),
      ),
    ];

    if (targetIds.length === 0) return [];

    return await repo.find({
      where: { id: In(targetIds) },
    });
  }

  /**
   * Groups the target entities by the current entity that references them.
   * @param targetEntities - The target entities to group.
   * @param currentEntities - The current entities that reference the target entities.
   * @param targetEntityName - The name of the target entity (for reverse lookup).
   * @returns A record where the key is the ID of the current entity and the value is an array of target entities that are referenced by the current entity.
   */
  private groupReverseRelatedEntities(
    targetEntities: ObjectLiteral[],
    currentEntities: ObjectLiteral[],
    targetEntityName: string,
  ): Record<string, ObjectLiteral[]> {
    const grouped: Record<string, ObjectLiteral[]> = {};

    for (const currentEntity of currentEntities) {
      const currentId = currentEntity.id as string;
      grouped[currentId] = [];

      if (currentEntity.refTable === targetEntityName) {
        const targetEntity = targetEntities.find((target) => target.id === currentEntity.refId);
        if (targetEntity) {
          grouped[currentId] = [targetEntity];
        }
      }
    }

    return grouped;
  }
}
