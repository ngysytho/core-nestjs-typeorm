import { Entity, FindOptionsOrder, FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';
import { PaginationResponseInterface } from '../types/response';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { Pagination } from '../decorators/pagination-params.decorator';
import { Sorting } from '../decorators/sorting-params.decorator';
import { Filtering } from '../decorators/filtering-params.decorator';
import { getOrder, getRelation, getWhere } from '../helpers';
import { Including } from '../decorators/including-params.decorator';

@Injectable()
export default abstract class BaseService<Entity extends ObjectLiteral> {
  /**
   * Creates a new instance of the service.
   * @param repository - The typeorm repository for the entity.
   */
  constructor(
    @InjectRepository(Entity)
    protected readonly repository: Repository<Entity>,
  ) {}

  /**
   * Paginates entities based on the provided filtering, sorting, and including criteria.
   * @param pagination - The pagination parameters.
   * @param pagination.limit
   * @param pagination.offset
   * @param pagination.limit
   * @param pagination.offset
   * @param filters - The filtering parameters.
   * @param sorts - The sorting parameters.
   * @param include - The relations to include in the result.
   * @param filterData - Additional filter data.
   * @returns A promise that resolves to a PaginationResponseInterface.
   */
  async paginate(
    { limit, offset }: Pagination,
    filters?: Filtering[],
    sorts?: Sorting[],
    include?: Including,
    filterData?: Partial<Entity>,
  ): Promise<PaginationResponseInterface<Entity>> {
    const where = filters ? (getWhere(filters) as FindOptionsOrder<Entity>) : {};
    const order = sorts ? (getOrder(sorts) as FindOptionsOrder<Entity>) : {};
    const relations = include ? getRelation(include) : {};
    // Adjust findAndCount call based on limit
    let findOptions = {
      where: {
        ...where,
        ...filterData,
      },
      order,
      relations,
      take: Infinity,
      skip: offset,
    };
    if (limit !== Infinity) {
      findOptions = {
        ...findOptions,
        take: limit,
        skip: offset,
      };
    }

    const [items, total] = await this.repository.findAndCount(findOptions);

    return {
      count: total,
      rows: items,
    };
  }

  /**
   * Finds entities based on the provided filtering, sorting, and including criteria.
   *
   * @param filters - The filtering parameters.
   * @param sorts - The sorting parameters.
   * @param include - The relations to include in the result.
   * @param filterData - Additional filter data.
   * @returns A promise that resolves to an array of entities matching the criteria.
   */
  public async findByCriteria(
    filters?: Filtering[],
    sorts?: Sorting[],
    include?: Including,
    filterData?: Partial<Entity>,
  ): Promise<Entity[]> {
    // Transform the filtering and sorting criteria into WHERE and ORDER BY clauses
    const where = filters ? (getWhere(filters) as FindOptionsOrder<Entity>) : {};
    const order = sorts ? (getOrder(sorts) as FindOptionsOrder<Entity>) : {};
    const relations = include ? getRelation(include) : [];

    // Use the repository to find entities matching the criteria
    return await this.repository.find({
      where: {
        ...where,
        ...filterData,
      },
      order,
      relations,
    });
  }

  /**
   * Finds one entity by the provided filtering and including criteria.
   *
   * @param {Filtering[]} [filters] - The filtering parameters.
   * @param {Including} [include] - The relations to include in the result.
   * @param {Partial<Entity>} [filterData] - Additional filter data.
   * @returns {Promise<Entity | null>} A promise that resolves to the first entity
   * matching the criteria or null if no matching entity is found.
   */
  public async findOneByCriteria(
    filters?: Filtering[],
    include?: Including,
    filterData?: Partial<Entity>,
  ): Promise<Entity | null> {
    // Transform the filtering and sorting criteria into WHERE and ORDER BY clauses
    const where = filters ? (getWhere(filters) as FindOptionsOrder<Entity>) : {};
    const relations = include ? getRelation(include) : [];

    // Use the repository to find the first entity matching the criteria
    // or null if no matching entity is found
    return await this.repository.findOne({
      where: { ...where, ...filterData },
      relations,
    });
  }

  /**
   * Finds one entity by the provided filtering and including criteria.
   * If no matching entity is found, throws a `NotFoundException`.
   *
   * @param {Filtering[]} [filters] - The filtering parameters.
   * @param {Including} [include] - The relations to include in the result.
   * @param {Partial<Entity>} [filterData] - Additional filter data.
   * @returns {Promise<Entity>} A promise that resolves to the first entity
   * matching the criteria or throws a `NotFoundException` if no matching entity is found.
   */
  public async findOneOrFailByCriteria(
    filters?: Filtering[],
    include?: Including,
    filterData?: Partial<Entity>,
  ): Promise<Entity> {
    // Transform the filtering and sorting criteria into WHERE and ORDER BY clauses
    const where: FindOptionsWhere<Entity> = filters ? (getWhere(filters) as FindOptionsWhere<Entity>) : {};
    const relations = include ? getRelation(include) : [];

    // Use the repository to find the first entity matching the criteria
    // or null if no matching entity is found
    return await this.repository.findOneOrFail({
      where: {
        ...where,
        ...filterData,
      },
      relations,
    });
  }

  /**
   * Checks if an entity with the given filter criteria exists.
   *
   * @param {Filtering[]} [filters] - The filtering parameters.
   * @param {Including} [include] - The including parameters.
   * @param {any} [filterData] - Additional filter data.
   * @returns {Promise<boolean>} A promise that resolves to true if the entity exists, false otherwise.
   */
  public async exists(filters?: Filtering[], include?: Including, filterData?: Partial<Entity>): Promise<boolean> {
    // Transform the filtering and sorting criteria into WHERE and ORDER BY clauses
    const where = filters ? (getWhere(filters) as FindOptionsOrder<Entity>) : {};
    const relations = include ? getRelation(include) : [];

    // Use the repository to find the first entity matching the criteria
    // or null if no matching entity is found
    const doc = await this.repository.findOne({
      where, // The WHERE clause
      relations, // The relations to include
      ...filterData, // Additional filter data
    });

    // Return true if the document exists, false otherwise
    return !!doc;
  }

  /**
   * Bulk create or update multiple entities in the repository.
   *
   * @param {Entity[]} entities - Array of entities to be created or updated.
   * @returns {Promise<Entity[]>} A promise that resolves to the array of created or updated entities.
   */
  public async bulkCreateOrUpdate(entities: Entity[]): Promise<Entity[]> {
    return await this.repository.save(entities);
  }

  /**
   * Calculates a specific aggregate function on a given field.
   *
   * @param {keyof Entity} field - The field on which to apply the aggregate function.
   * @param {"MAX" | "MIN" | "SUM"} func - The aggregate function to apply.
   * @returns {Promise<number | null>} - The result of the aggregate function, or null if no result is found.
   */
  private async aggregateFunction(
    field: keyof Entity, // The field on which to apply the aggregate function
    func: 'MAX' | 'MIN' | 'SUM', // The aggregate function to apply
  ): Promise<number | null> {
    // Create a query builder for the repository
    const result = await this.repository
      .createQueryBuilder('entity') // Start the query builder with the entity alias
      .select(`${func}(entity.${field as string})`, 'result') // Select the aggregate function on the specified field
      .getRawOne(); // Execute the query and get the raw result

    // Parse the result and return the aggregate function value, or null if no result is found
    return result ? parseFloat(result.result) : null;
  }

  /**
   * Returns the count of entities matching the given filter criteria.
   *
   * @param {Filtering[]} [filters] - The filtering parameters.
   * @param {any} [filterData] - Additional filter data.
   * @returns {Promise<number>} A promise that resolves to the count of entities matching the criteria.
   */
  async count(filters?: Filtering[], filterData?: Partial<Entity>): Promise<number> {
    const where = filters ? (getWhere(filters) as FindOptionsOrder<Entity>) : {};
    const findOptions = {
      where: {
        ...where,
        ...filterData,
      },
      take: Infinity, // No limit to the amount of results
    };

    // Use the repository to count the entities matching the criteria
    const total = await this.repository.count(findOptions);

    return total;
  }

  /**
   * Calculates the maximum value for a given field.
   *
   * @param {keyof Entity} field - The field for which to calculate the maximum value.
   * @returns {Promise<number | null>} - The maximum value for the given field, or null if no result is found.
   */
  public async max(field: keyof Entity): Promise<number | null> {
    return this.aggregateFunction(field, 'MAX');
  }

  /**
   * Calculates the minimum value for a given field.
   *
   * @param {keyof Entity} field - The field for which to calculate the minimum value.
   * @returns {Promise<number | null>} - The minimum value for the given field, or null if no result is found.
   */
  public async min(field: keyof Entity): Promise<number | null> {
    return this.aggregateFunction(field, 'MIN');
  }

  /**
   * Calculates the sum of values for a given field across all entities.
   *
   * @param {keyof Entity} field - The field for which to calculate the sum of values.
   * @returns {Promise<number | null>} - The sum of values for the given field, or null if no result is found.
   */
  public async sum(field: keyof Entity): Promise<number | null> {
    return this.aggregateFunction(field, 'SUM');
  }
}
